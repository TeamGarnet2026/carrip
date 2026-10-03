import { geocodeAddress } from '@/lib/google/places'
import { estimateRouteMetricsLocally } from '@/lib/google/routes-api'
import { resolveFuelPriceForVehicle } from '@/lib/prices/fuel'
import { resolveDestinationPoints } from '@/lib/routes/build'
import { buildSingleRoute, routeStopToPoiPlace } from '@/lib/routes/build-route'
import { buildCostBreakdown, sumCostBreakdown } from '@/lib/routes/cost-estimate'
import {
  buildDestinationStopsAsPlaces,
  isDirectRoute,
} from '@/lib/routes/cost-focused-plan'
import {
  aggregateParkingSource,
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

/** 編集後の立ち寄り地点でルートと費用を再計算する（運転交代地点の挿入を含む） */
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

  const touristStops = stops.filter((stop) => !stop.is_rest_stop)
  // 直行ルートに観光地が追加されたら、駐車場代・入場料も計上する通常ルートとして扱う
  const directRoute = isDirectRoute(input.route_id) && touristStops.length === 0

  let pathStops = stops.map(routeStopToPoiPlace)
  if (isDirectRoute(input.route_id)) {
    // 直行ルートの休憩地点は目的地ウェイポイントを基準に挿入し直す
    const destinations = await resolveDestinationPoints(request.prefecture)
    pathStops = [
      ...touristStops.map(routeStopToPoiPlace),
      ...buildDestinationStopsAsPlaces(request.prefecture, destinations),
    ]
  }

  const { route, degradedReason } = await buildSingleRoute({
    request,
    routeId: input.route_id,
    title: '',
    summary: '',
    origin: originLatLng,
    pathStops,
    directRoute,
    fuelPrice,
    presetStops: new Map(stops.map((stop) => [stop.place_id, stop])),
  })

  return {
    stops: route.stops,
    polyline: route.polyline,
    sections: route.sections,
    cost_breakdown: route.cost_breakdown,
    cost_sources: route.cost_sources,
    total_distance_km: route.total_distance_km,
    total_duration_min: route.total_duration_min,
    total_cost: route.total_cost,
    cost_per_person: route.cost_per_person,
    departure_time: route.departure_time,
    arrival_time: route.arrival_time,
    round_trip: route.round_trip,
    degraded: degradedReason != null,
  }
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
