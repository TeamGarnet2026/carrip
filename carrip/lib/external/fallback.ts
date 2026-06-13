import type { DegradedReason } from '@/lib/routes/degraded'
import { computeRouteMetrics } from '@/lib/google/routes-api'
import type { PoiPlace } from '@/lib/google/types'
import {
  estimateParkingFallback,
  resolveParkingFeesForStops,
} from '@/lib/navitime/parking'
import {
  fetchNavitimeCarRoute,
  type NavitimeCarRouteResult,
} from '@/lib/navitime/route-car'
import type { RouteGenerateRequest } from '@/lib/routes/types'

export type RouteMetricsFallbackResult = {
  distanceKm: number
  durationMin: number
  tollYen: number
  polyline: Array<{ lat: number; lng: number }>
  sections: NavitimeCarRouteResult['sections']
  departureTime?: string
  arrivalTime?: string
  degraded: boolean
  degraded_reason?: Extract<DegradedReason, 'navitime' | 'google_routes'>
}

export async function fetchNavitimeCarRouteWithFallback(input: {
  request: RouteGenerateRequest
  routeId: string
  origin: { lat: number; lng: number }
  stops: Array<{ name: string; lat: number; lng: number; id?: string; category?: string }>
}): Promise<RouteMetricsFallbackResult> {
  try {
    const navitime = await fetchNavitimeCarRoute(input)
    return {
      ...navitime,
      degraded: false,
    }
  } catch (error) {
    console.warn('NAVITIME route failed, using Google Routes fallback:', error)

    const poiStops: PoiPlace[] = input.stops.map((stop, index) => ({
      id: stop.id ?? `fallback-${index}`,
      name: stop.name,
      address: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      category: stop.category,
    }))

    const metrics = await computeRouteMetrics(input.request.origin, poiStops, {
      useHighway: input.request.options?.use_highway !== false,
      originLatLng: input.origin,
    })

    return {
      distanceKm: metrics.distanceKm,
      durationMin: metrics.durationMin,
      tollYen: 0,
      polyline: poiStops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
      sections: [
        {
          type: 'move',
          name: '概算走行',
          distance_km: metrics.distanceKm,
          duration_min: metrics.durationMin,
        },
      ],
      degraded: true,
      degraded_reason: metrics.degraded ? 'google_routes' : 'navitime',
    }
  }
}

export async function resolveParkingFeesWithFallback(
  stops: Array<{
    id: string
    name: string
    lat: number
    lng: number
    category?: string
    stay_minutes?: number
  }>,
  degraded: boolean
): Promise<number> {
  if (degraded) {
    return estimateParkingFallback(stops.length)
  }

  try {
    const fees = await resolveParkingFeesForStops(stops)
    return fees.reduce((total, fee) => total + fee.total_yen, 0)
  } catch (error) {
    console.warn('Parking fee lookup failed, using fallback estimate:', error)
    return estimateParkingFallback(stops.length)
  }
}
