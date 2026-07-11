import { getGoogleCloudApiKey } from '@/lib/google/config'
import type { PoiPlace, RouteMetrics } from '@/lib/google/types'

type ComputeRoutesResponse = {
  routes?: Array<{
    distanceMeters?: number
    duration?: string
  }>
}

function parseDurationSeconds(duration?: string): number {
  if (!duration) return 0
  return Number.parseInt(duration.replace('s', ''), 10) || 0
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const r = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function estimateMetricsFromCoords(
  originLatLng: { lat: number; lng: number } | null,
  stops: PoiPlace[],
  roundTrip = false
): RouteMetrics {
  if (stops.length === 0) {
    return { distanceKm: 0, durationMin: 0 }
  }

  let totalKm = 0
  let prevLat = originLatLng?.lat ?? stops[0].lat
  let prevLng = originLatLng?.lng ?? stops[0].lng

  for (const stop of stops) {
    totalKm += haversineKm(prevLat, prevLng, stop.lat, stop.lng)
    prevLat = stop.lat
    prevLng = stop.lng
  }

  if (roundTrip && originLatLng) {
    totalKm += haversineKm(prevLat, prevLng, originLatLng.lat, originLatLng.lng)
  }

  const roadFactor = 1.35
  const distanceKm = Math.round(totalKm * roadFactor)
  const durationMin = Math.round((distanceKm / 40) * 60)

  return { distanceKm, durationMin }
}

/** 外部APIを使わない簡易メトリクス推定（スタブ・テスト用） */
export function estimateRouteMetricsLocally(
  originLatLng: { lat: number; lng: number } | null,
  stops: PoiPlace[],
  roundTrip = false
): RouteMetrics {
  return estimateMetricsFromCoords(originLatLng, stops, roundTrip)
}

export async function computeRouteMetrics(
  origin: string,
  stops: PoiPlace[],
  options: {
    useHighway?: boolean
    originLatLng?: { lat: number; lng: number } | null
    roundTrip?: boolean
  } = {}
): Promise<RouteMetrics & { degraded?: boolean }> {
  if (stops.length === 0) {
    return { distanceKm: 0, durationMin: 0 }
  }

  const apiKey = getGoogleCloudApiKey()
  const roundTrip = options.roundTrip === true
  const destination = roundTrip ? null : stops[stops.length - 1]
  const intermediateStops = roundTrip ? stops : stops.slice(0, -1)
  const intermediates = intermediateStops.map((stop) => ({
    location: {
      latLng: { latitude: stop.lat, longitude: stop.lng },
    },
  }))

  const response = await fetch(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: destination
          ? {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng,
              },
            }
          : { address: origin },
        intermediates,
        travelMode: 'DRIVE',
        routingPreference: options.useHighway === false ? 'TRAFFIC_UNAWARE' : 'TRAFFIC_AWARE',
      }),
    }
  )

  if (!response.ok) {
    console.warn('Routes API failed, using distance estimate:', await response.text())
    return {
      ...estimateMetricsFromCoords(options.originLatLng ?? null, stops, roundTrip),
      degraded: true,
    }
  }

  const data = (await response.json()) as ComputeRoutesResponse
  const route = data.routes?.[0]

  if (!route?.distanceMeters) {
    return {
      ...estimateMetricsFromCoords(options.originLatLng ?? null, stops, roundTrip),
      degraded: true,
    }
  }

  return {
    distanceKm: Math.round(route.distanceMeters / 1000),
    durationMin: Math.round(parseDurationSeconds(route.duration) / 60),
  }
}
