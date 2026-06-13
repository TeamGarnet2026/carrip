import {
  conditionForRouteVariant,
  getNavitimeConfig,
} from '@/lib/navitime/config'
import type { RouteGenerateRequest } from '@/lib/routes/types'
import { applyEtcTollDiscount } from '@/lib/toll/etc-discount'
import { extractTollYen } from '@/lib/toll/extract-toll'

type NavitimePoint = {
  lat: number
  lon: number
  name?: string
}

type NavitimeFare = Record<string, number>

type NavitimeRouteItem = {
  summary?: {
    move?: {
      distance?: number
      time?: number
      fare?: NavitimeFare
      from_time?: string
      to_time?: string
    }
  }
  sections?: Array<{
    type?: string
    name?: string
    distance?: number
    time?: number
    road_name?: string
  }>
  shapes?: {
    features?: Array<{
      geometry?: {
        type?: string
        coordinates?: Array<[number, number]>
      }
      properties?: {
        line_style?: string
      }
    }>
  }
}

type NavitimeRouteResponse = {
  status_code?: number
  message?: string
  items?: NavitimeRouteItem[]
}

export type NavitimeCarRouteInput = {
  request: RouteGenerateRequest
  routeId: string
  origin: { lat: number; lng: number }
  stops: Array<{ name: string; lat: number; lng: number }>
}

export type NavitimeCarRouteResult = {
  distanceKm: number
  durationMin: number
  tollYen: number
  polyline: Array<{ lat: number; lng: number }>
  sections: Array<{
    type: string
    name: string
    distance_km?: number
    duration_min?: number
  }>
  departureTime?: string
  arrivalTime?: string
}

function buildStartTime(request: RouteGenerateRequest): string {
  const time = request.options?.departure_time ?? '08:00'
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return `${request.departure_date}T${normalizedTime}`
}

function extractPolyline(item: NavitimeRouteItem): Array<{ lat: number; lng: number }> {
  const features = item.shapes?.features ?? []
  const points: Array<{ lat: number; lng: number }> = []

  for (const feature of features) {
    if (feature.geometry?.type !== 'LineString') continue
    for (const [lon, lat] of feature.geometry.coordinates ?? []) {
      points.push({ lat, lng: lon })
    }
  }

  return points
}

function resolveTollYen(
  fare: NavitimeFare | undefined,
  request: RouteGenerateRequest
): number {
  const hasEtcCard = request.options?.etc_card !== false
  const departureTime = request.options?.departure_time ?? '08:00'

  if (!hasEtcCard) {
    return extractTollYen(fare, request.vehicle.type, false)
  }

  const etcBaseToll = extractTollYen(fare, request.vehicle.type, true)
  return applyEtcTollDiscount(etcBaseToll, {
    departureDate: request.departure_date,
    departureTime,
    hasEtcCard: true,
  }).tollYen
}

function extractSections(item: NavitimeRouteItem) {
  return (item.sections ?? [])
    .filter((section) => section.type === 'move' || section.type === 'point')
    .map((section) => ({
      type: section.type ?? 'move',
      name: section.name ?? (section.type === 'move' ? '走行' : '地点'),
      distance_km:
        section.distance != null ? Math.round(section.distance / 100) / 10 : undefined,
      duration_min: section.time ?? undefined,
    }))
}

export async function fetchNavitimeCarRoute(
  input: NavitimeCarRouteInput
): Promise<NavitimeCarRouteResult> {
  const { apiKey, host } = getNavitimeConfig()
  const { request, routeId, origin, stops } = input

  if (stops.length === 0) {
    throw new Error('ルート算出に必要な停留地がありません')
  }

  const goal = stops[stops.length - 1]
  const via = stops.slice(0, -1).map((stop) => ({
    lat: stop.lat,
    lon: stop.lng,
    name: stop.name,
  }))

  const useHighway = request.options?.use_highway !== false
  let condition = conditionForRouteVariant(routeId)
  if (!useHighway) {
    condition = 'free_only'
  }

  const params = new URLSearchParams()
  params.set('start', `${origin.lat},${origin.lng}`)
  params.set('goal', `${goal.lat},${goal.lng}`)
  if (via.length > 0) {
    params.set('via', JSON.stringify(via))
  }
  params.set('shape', 'true')
  params.set('condition', condition)
  params.set('start_time', buildStartTime(request))
  if (request.options?.etc_card !== false) {
    params.set('etc', 'use')
  }

  const response = await fetch(`https://${host}/route_car?${params.toString()}`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': host,
    },
    next: { revalidate: 0 },
  })

  const data = (await response.json()) as NavitimeRouteResponse

  if (!response.ok || data.status_code) {
    throw new Error(data.message ?? `NAVITIME API エラー (${response.status})`)
  }

  const item = data.items?.[0]
  const move = item?.summary?.move

  if (!item || !move?.distance || move.time == null) {
    throw new Error('NAVITIME から有効な車ルートが取得できませんでした')
  }

  return {
    distanceKm: Math.round((move.distance / 1000) * 10) / 10,
    durationMin: move.time,
    tollYen: resolveTollYen(move.fare, request),
    polyline: extractPolyline(item),
    sections: extractSections(item),
    departureTime: move.from_time,
    arrivalTime: move.to_time,
  }
}
