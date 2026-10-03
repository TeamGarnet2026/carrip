import {
  fetchNavitimeCarRouteWithFallback,
  resolveParkingFeeDetailsWithFallback,
  type RouteMetricsFallbackResult,
} from '@/lib/external/fallback'
import { resolveAdmissionFeesForStops } from '@/lib/google/places'
import type { PoiPlace } from '@/lib/google/types'
import type { LatLng } from '@/lib/maps/route-corridor'
import type { ParkingFeeResult } from '@/lib/navitime/parking'
import { insertDriverChangeStops, isTouristStop } from '@/lib/poi/rest-area'
import type { FuelPriceResult } from '@/lib/prices/fuel'
import {
  isDestinationRoutingStop,
  usesHighwayForRoute,
} from '@/lib/routes/cost-focused-plan'
import { buildCostBreakdown, sumCostBreakdown } from '@/lib/routes/cost-estimate'
import { aggregateParkingSource } from '@/lib/routes/cost-sources'
import type { DegradedReason } from '@/lib/routes/degraded'
import type {
  RouteCandidate,
  RouteGenerateRequest,
  RouteStop,
} from '@/lib/routes/types'

/** NAVITIME 呼び出し回数を抑えるため、運転交代地点の挿入による再探索は最大3回 */
const MAX_DRIVER_CHANGE_ATTEMPTS = 3

export type BuildSingleRouteInput = {
  request: RouteGenerateRequest
  routeId: string
  title: string
  summary: string
  origin: LatLng
  /** ルート探索に使う地点（直行ルートでは目的地ウェイポイントを含む） */
  pathStops: PoiPlace[]
  /** 観光地なしの直行ルート（駐車場代・入場料を計上しない） */
  directRoute: boolean
  fuelPrice: Pick<FuelPriceResult, 'price_yen' | 'source'>
  /** ユーザーが編集済みの値（駐車場代・滞在時間・入場料）を優先する */
  presetStops?: Map<string, RouteStop>
}

export type BuildSingleRouteResult = {
  route: RouteCandidate
  degradedReason?: DegradedReason
}

export function routeStopToPoiPlace(stop: RouteStop): PoiPlace {
  return {
    id: stop.place_id,
    name: stop.name,
    address: stop.address,
    lat: stop.lat,
    lng: stop.lng,
    category: stop.category,
  }
}

function toNavitimeStops(stops: PoiPlace[]) {
  return stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    lat: stop.lat,
    lng: stop.lng,
    category: stop.category,
  }))
}

async function fetchRouteWithDriverChanges(
  input: BuildSingleRouteInput
): Promise<{ pathStops: PoiPlace[]; navitime: RouteMetricsFallbackResult }> {
  const { request, routeId, origin } = input
  const maxDriveMin = request.options?.max_drive_min ?? 120
  const roundTrip = request.options?.round_trip === true
  const useHighway = usesHighwayForRoute(routeId, request)

  let pathStops = input.pathStops
  let navitime = await fetchNavitimeCarRouteWithFallback({
    request,
    routeId,
    origin,
    stops: toNavitimeStops(pathStops),
  })

  if (maxDriveMin > 0) {
    for (let attempt = 0; attempt < MAX_DRIVER_CHANGE_ATTEMPTS; attempt += 1) {
      const withDriverChangeStops = await insertDriverChangeStops(
        pathStops,
        navitime.sections,
        maxDriveMin,
        useHighway,
        origin,
        roundTrip,
        navitime.polyline
      )

      if (withDriverChangeStops.length === pathStops.length) break

      pathStops = withDriverChangeStops
      navitime = await fetchNavitimeCarRouteWithFallback({
        request,
        routeId,
        origin,
        stops: toNavitimeStops(pathStops),
      })
    }
  }

  return { pathStops, navitime }
}

function visibleStopsForRoute(
  pathStops: PoiPlace[],
  directRoute: boolean
): PoiPlace[] {
  const withoutWaypoints = pathStops.filter(
    (stop) => !isDestinationRoutingStop(stop.id)
  )
  if (!directRoute) return withoutWaypoints
  // 直行プランは運転交代の休憩所のみ表示
  return withoutWaypoints.filter((stop) => !isTouristStop(stop))
}

async function resolveAdmissionByPlaceId(
  touristStops: PoiPlace[],
  presetStops: Map<string, RouteStop> | undefined
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  const missing: PoiPlace[] = []

  for (const stop of touristStops) {
    const preset = presetStops?.get(stop.id)?.admission_yen_per_person
    if (preset != null) {
      result.set(stop.id, preset)
    } else {
      missing.push(stop)
    }
  }

  const fees = await resolveAdmissionFeesForStops(missing)
  missing.forEach((stop, index) => result.set(stop.id, fees[index] ?? 0))
  return result
}

async function resolveParkingByPlaceId(
  stops: PoiPlace[],
  presetStops: Map<string, RouteStop> | undefined,
  degraded: boolean
): Promise<Map<string, ParkingFeeResult>> {
  const missing = stops.filter(
    (stop) => presetStops?.get(stop.id)?.parking_yen == null
  )
  const fees = await resolveParkingFeeDetailsWithFallback(
    missing.map((stop) => ({
      id: stop.id,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      category: stop.category,
      stay_minutes: presetStops?.get(stop.id)?.stay_minutes,
    })),
    degraded
  )
  return new Map(fees.map((fee) => [fee.place_id, fee]))
}

function mapStopsForResponse(
  stops: PoiPlace[],
  parkingByPlaceId: Map<string, ParkingFeeResult>,
  admissionByPlaceId: Map<string, number>,
  presetStops: Map<string, RouteStop> | undefined
): RouteStop[] {
  return stops.map((stop) => {
    const preset = presetStops?.get(stop.id)
    const parking = parkingByPlaceId.get(stop.id)
    const usePreset = preset?.parking_yen != null

    return {
      place_id: stop.id,
      name: stop.name,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      category: stop.category,
      is_rest_stop: !isTouristStop(stop),
      stay_minutes: preset?.stay_minutes ?? parking?.stay_minutes ?? 60,
      parking_yen: usePreset ? preset.parking_yen : (parking?.total_yen ?? 0),
      parking_source: usePreset
        ? (preset.parking_source ?? 'manual')
        : (parking?.source ?? 'estimate'),
      admission_yen_per_person: admissionByPlaceId.get(stop.id) ?? 0,
    }
  })
}

/** 1本のルートについて、経路探索・運転交代地点の挿入・駐車場代/入場料・費用計算までを行う */
export async function buildSingleRoute(
  input: BuildSingleRouteInput
): Promise<BuildSingleRouteResult> {
  const { request, directRoute, presetStops, fuelPrice } = input
  const { pathStops, navitime } = await fetchRouteWithDriverChanges(input)

  const visibleStops = visibleStopsForRoute(pathStops, directRoute)

  let parkingByPlaceId = new Map<string, ParkingFeeResult>()
  let admissionByPlaceId = new Map<string, number>()
  if (!directRoute) {
    ;[parkingByPlaceId, admissionByPlaceId] = await Promise.all([
      resolveParkingByPlaceId(visibleStops, presetStops, navitime.degraded),
      resolveAdmissionByPlaceId(
        visibleStops.filter(isTouristStop),
        presetStops
      ),
    ])
  }

  const stops = mapStopsForResponse(
    visibleStops,
    parkingByPlaceId,
    admissionByPlaceId,
    presetStops
  )

  const parkingYen = directRoute
    ? 0
    : stops.reduce((total, stop) => total + (stop.parking_yen ?? 0), 0)
  const admissionPerPerson = directRoute
    ? []
    : stops
        .filter((stop) => !stop.is_rest_stop)
        .map((stop) => stop.admission_yen_per_person ?? 0)

  const costBreakdown = buildCostBreakdown(
    request,
    navitime.distanceKm,
    navitime.tollYen,
    admissionPerPerson,
    parkingYen,
    fuelPrice.price_yen
  )
  const totalCost = sumCostBreakdown(costBreakdown)
  const toll = navitime.degraded ? ('estimate' as const) : ('navitime' as const)

  return {
    route: {
      id: input.routeId,
      title: input.title,
      summary: input.summary,
      transport_mode: 'car',
      stops,
      polyline: navitime.polyline,
      sections: navitime.sections,
      cost_breakdown: costBreakdown,
      cost_sources: directRoute
        ? { fuel: fuelPrice.source, toll }
        : {
            fuel: fuelPrice.source,
            toll,
            parking: aggregateParkingSource(stops),
            admission: 'places',
          },
      total_distance_km: navitime.distanceKm,
      total_duration_min: navitime.durationMin,
      total_cost: totalCost,
      cost_per_person: Math.round(totalCost / Math.max(1, request.people)),
      departure_time: navitime.departureTime,
      arrival_time: navitime.arrivalTime,
      round_trip: request.options?.round_trip === true,
    },
    degradedReason:
      navitime.degraded && navitime.degraded_reason
        ? navitime.degraded_reason
        : undefined,
  }
}
