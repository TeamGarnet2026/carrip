import type { DegradedReason } from '@/lib/routes/degraded'
import { computeRouteMetrics } from '@/lib/google/routes-api'
import type { PoiPlace } from '@/lib/google/types'
import {
  DEFAULT_PARKING_YEN_PER_HOUR,
  DEFAULT_STAY_MINUTES,
  estimateParkingFallback,
  resolveParkingFeesForStops,
  type ParkingFeeResult,
} from '@/lib/navitime/parking'
import {
  fetchNavitimeCarRoute,
  type NavitimeCarRouteResult,
} from '@/lib/navitime/route-car'
import { usesHighwayForRoute } from '@/lib/routes/cost-focused-plan'
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
      useHighway: usesHighwayForRoute(input.routeId),
      originLatLng: input.origin,
      roundTrip: input.request.options?.round_trip === true,
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

type ParkingFallbackStop = {
  id: string
  name: string
  lat: number
  lng: number
  category?: string
  stay_minutes?: number
}

function estimateParkingDetails(
  stops: ParkingFallbackStop[]
): ParkingFeeResult[] {
  return stops.map((stop) => ({
    place_id: stop.id,
    name: stop.name,
    hourly_yen: DEFAULT_PARKING_YEN_PER_HOUR,
    stay_minutes: stop.stay_minutes ?? DEFAULT_STAY_MINUTES,
    total_yen: estimateParkingFallback(1, stop.stay_minutes),
    source: 'category_default',
  }))
}

export async function resolveParkingFeeDetailsWithFallback(
  stops: ParkingFallbackStop[],
  degraded: boolean
): Promise<ParkingFeeResult[]> {
  if (degraded) {
    return estimateParkingDetails(stops)
  }

  try {
    return await resolveParkingFeesForStops(stops)
  } catch (error) {
    console.warn('Parking fee lookup failed, using fallback estimate:', error)
    return estimateParkingDetails(stops)
  }
}

export async function resolveParkingFeesWithFallback(
  stops: ParkingFallbackStop[],
  degraded: boolean
): Promise<number> {
  const fees = await resolveParkingFeeDetailsWithFallback(stops, degraded)
  return fees.reduce((total, fee) => total + fee.total_yen, 0)
}
