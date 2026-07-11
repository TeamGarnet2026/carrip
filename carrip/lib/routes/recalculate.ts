import { fetchNavitimeCarRouteWithFallback } from '@/lib/external/fallback'
import { geocodeAddress } from '@/lib/google/places'
import { estimateRouteMetricsLocally } from '@/lib/google/routes-api'
import { resolveFuelPriceForVehicle } from '@/lib/prices/fuel'
import { buildCostBreakdown, sumCostBreakdown } from '@/lib/routes/cost-estimate'
import {
  aggregateParkingSource,
  sumStopAdmissionPerPerson,
  sumStopParking,
} from '@/lib/routes/cost-sources'
import type { RouteRecalculateInput } from '@/lib/routes/schema'
import type {
  CostSources,
  RouteCandidate,
  RouteSection,
  RouteStop,
} from '@/lib/routes/types'

export type RouteRecalculateResult = Pick<
  RouteCandidate,
  | 'stops'
  | 'polyline'
  | 'sections'
  | 'cost_breakdown'
  | 'cost_sources'
  | 'total_distance_km'
  | 'total_duration_min'
  | 'total_cost'
  | 'cost_per_person'
  | 'departure_time'
  | 'arrival_time'
  | 'round_trip'
> & {
  degraded: boolean
}

function buildResult(
  input: RouteRecalculateInput,
  stops: RouteStop[],
  metrics: {
    distanceKm: number
    durationMin: number
    tollYen: number
    polyline: Array<{ lat: number; lng: number }>
    sections: RouteSection[]
    departureTime?: string
    arrivalTime?: string
    degraded: boolean
  },
  fuelSource: CostSources['fuel'],
  fuelPriceYen: number
): RouteRecalculateResult {
  const { request } = input
  const parkingYen = sumStopParking(stops)
  const admissionPerPerson = stops
    .filter((stop) => !stop.is_rest_stop)
    .map((stop) => stop.admission_yen_per_person ?? 0)

  const costBreakdown = buildCostBreakdown(
    request,
    metrics.distanceKm,
    metrics.tollYen,
    admissionPerPerson,
    parkingYen,
    fuelPriceYen
  )
  const totalCost = sumCostBreakdown(costBreakdown)

  return {
    stops,
    polyline: metrics.polyline,
    sections: metrics.sections,
    cost_breakdown: costBreakdown,
    cost_sources: {
      fuel: fuelSource,
      toll: metrics.degraded ? 'estimate' : 'navitime',
      parking: aggregateParkingSource(stops),
      admission: 'places',
    },
    total_distance_km: metrics.distanceKm,
    total_duration_min: metrics.durationMin,
    total_cost: totalCost,
    cost_per_person: Math.round(totalCost / Math.max(1, request.people)),
    departure_time: metrics.departureTime,
    arrival_time: metrics.arrivalTime,
    round_trip: input.request.options?.round_trip === true,
    degraded: metrics.degraded,
  }
}

/** 編集後の立ち寄り地点でルートと費用を再計算（NAVITIME 1回 + 燃料単価のみ） */
export async function recalculateRoute(
  input: RouteRecalculateInput
): Promise<RouteRecalculateResult> {
  const { request, stops } = input

  const originLatLng = await geocodeAddress(request.origin)
  if (!originLatLng) {
    throw new Error(`出発地「${request.origin}」の位置情報を取得できませんでした`)
  }

  const fuelPrice = await resolveFuelPriceForVehicle(
    request.prefecture[0] ?? '東京都',
    request.vehicle
  )

  const navitime = await fetchNavitimeCarRouteWithFallback({
    request,
    routeId: input.route_id,
    origin: originLatLng,
    stops: stops.map((stop) => ({
      id: stop.place_id,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      category: stop.category,
    })),
  })

  return buildResult(
    input,
    stops,
    {
      distanceKm: navitime.distanceKm,
      durationMin: navitime.durationMin,
      tollYen: navitime.tollYen,
      polyline: navitime.polyline,
      sections: navitime.sections,
      departureTime: navitime.departureTime,
      arrivalTime: navitime.arrivalTime,
      degraded: navitime.degraded,
    },
    fuelPrice.source,
    fuelPrice.price_yen
  )
}

/** 外部APIを一切使わないスタブ再計算（直線距離ベース概算） */
export async function recalculateRouteStub(
  input: RouteRecalculateInput
): Promise<RouteRecalculateResult> {
  const { request, stops } = input
  const roundTrip = request.options?.round_trip === true

  const poiStops = stops.map((stop) => ({
    id: stop.place_id,
    name: stop.name,
    address: stop.address,
    lat: stop.lat,
    lng: stop.lng,
  }))

  const first = poiStops[0]
  const metrics = estimateRouteMetricsLocally(
    { lat: first.lat, lng: first.lng },
    poiStops,
    roundTrip
  )

  const fuelPrice = await resolveFuelPriceForVehicle(
    request.prefecture[0] ?? '東京都',
    request.vehicle
  )

  return buildResult(
    input,
    stops,
    {
      distanceKm: metrics.distanceKm,
      durationMin: metrics.durationMin,
      tollYen: 0,
      polyline: poiStops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
      sections: [
        {
          type: 'move',
          name: '概算走行（スタブ）',
          distance_km: metrics.distanceKm,
          duration_min: metrics.durationMin,
        },
      ],
      degraded: true,
    },
    fuelPrice.source,
    fuelPrice.price_yen
  )
}
