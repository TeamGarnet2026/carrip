import { VEHICLE_PRESETS } from '@/lib/plan/constants'
import { isRoundTripRoute } from '@/lib/maps/round-trip-display'
import type {
  CostBreakdown,
  RouteCandidate,
  RouteSection,
  RouteStop,
} from '@/lib/routes/types'
import type { Tables } from '@/types/supabase'

export type TripDetailRouteStop = {
  id: string
  stop_order: number
  stay_minutes: number
  parking_cost: number | null
  admission_fee: number | null
  is_rest_stop: boolean
  pois: {
    id: string
    google_place_id: string
    name: string
    lat: number
    lng: number
    prefecture: string | null
    category: string | null
    rating: number | null
  } | null
}

export type TripDetailRoute = Tables<'routes'> & {
  stops: TripDetailRouteStop[]
}

export type TripDetail = {
  trip: Tables<'trips'>
  routes: TripDetailRoute[]
}

function parseCostBreakdown(value: unknown): CostBreakdown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { fuel: 0, toll: 0, parking: 0, admission: 0 }
  }
  const obj = value as Record<string, unknown>
  return {
    fuel: typeof obj.fuel === 'number' ? obj.fuel : 0,
    toll: typeof obj.toll === 'number' ? obj.toll : 0,
    parking: typeof obj.parking === 'number' ? obj.parking : 0,
    admission: typeof obj.admission === 'number' ? obj.admission : 0,
  }
}

function readRoundTripFromVehicle(
  vehicleJson: Tables<'trips'>['vehicle_json']
): boolean | undefined {
  if (!vehicleJson || typeof vehicleJson !== 'object' || Array.isArray(vehicleJson)) {
    return undefined
  }
  if ('round_trip' in vehicleJson && typeof vehicleJson.round_trip === 'boolean') {
    return vehicleJson.round_trip
  }
  return undefined
}

function vehicleLabel(vehicleJson: Tables<'trips'>['vehicle_json']): string {
  if (!vehicleJson || typeof vehicleJson !== 'object' || Array.isArray(vehicleJson)) {
    return '未設定'
  }
  const type = 'type' in vehicleJson ? String(vehicleJson.type) : ''
  return VEHICLE_PRESETS.find((item) => item.id === type)?.label ?? type
}

function mapStopToRouteStop(stop: TripDetailRouteStop): RouteStop | null {
  const poi = stop.pois
  if (!poi) return null

  return {
    place_id: poi.google_place_id,
    name: poi.name,
    address: poi.prefecture ?? '',
    lat: poi.lat,
    lng: poi.lng,
    category: poi.category ?? undefined,
    is_rest_stop: stop.is_rest_stop,
    stay_minutes: stop.stay_minutes,
    parking_yen: stop.parking_cost ?? 0,
    parking_source: stop.parking_cost != null ? 'manual' : 'estimate',
    admission_yen_per_person: stop.admission_fee ?? 0,
  }
}

function buildPolyline(stops: RouteStop[]): Array<{ lat: number; lng: number }> {
  return stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))
}

function buildSections(
  distanceKm: number,
  durationMin: number
): RouteSection[] {
  if (distanceKm <= 0 && durationMin <= 0) return []
  return [
    {
      type: 'move',
      name: '保存時の走行概要',
      distance_km: distanceKm,
      duration_min: durationMin,
    },
  ]
}

/** DB に保存されたルートを提案画面と同じ RouteCandidate 形式へ変換 */
export function tripRouteToCandidate(
  route: TripDetailRoute,
  trip: Tables<'trips'>,
  index = 0
): RouteCandidate {
  const stops = route.stops
    .slice()
    .sort((a, b) => a.stop_order - b.stop_order)
    .map(mapStopToRouteStop)
    .filter((stop): stop is RouteStop => stop != null)

  const costBreakdown = parseCostBreakdown(route.cost_breakdown_json)
  const distanceKm = route.total_distance_km ?? 0
  const durationMin = route.total_duration_min ?? 0

  const savedRoundTrip = readRoundTripFromVehicle(trip.vehicle_json)
  let polyline = buildPolyline(stops)
  if (savedRoundTrip === true && polyline.length > 0) {
    polyline = [...polyline, polyline[0]]
  }

  const candidate: RouteCandidate = {
    id: route.id,
    title: `${trip.origin} → ${trip.prefecture.join('、')}`,
    summary: `${trip.days}日間 · ${trip.people}人 · ${vehicleLabel(trip.vehicle_json)}`,
    transport_mode: 'car',
    stops,
    polyline,
    sections: buildSections(distanceKm, durationMin),
    cost_breakdown: costBreakdown,
    total_distance_km: distanceKm,
    total_duration_min: durationMin,
    total_cost: route.total_cost ?? 0,
    cost_per_person:
      route.cost_per_person ??
      Math.round((route.total_cost ?? 0) / Math.max(1, trip.people)),
    round_trip: savedRoundTrip,
  }

  return {
    ...candidate,
    round_trip: savedRoundTrip ?? isRoundTripRoute(candidate),
  }
}

export function tripDetailToCandidates(detail: TripDetail): RouteCandidate[] {
  return detail.routes.map((route, index) =>
    tripRouteToCandidate(route, detail.trip, index)
  )
}
