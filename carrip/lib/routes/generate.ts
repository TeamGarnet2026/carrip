import {
  planRoutesWithGemini,
  resolveStopsFromPlan,
} from '@/lib/gemini/route-planner'
import {
  getCachedPlacesByPrefecture,
  setCachedPlacesByPrefecture,
} from '@/lib/cache/poi-cache'
import {
  isGeminiConfigured,
  isGoogleCloudConfigured,
} from '@/lib/google/config'
import {
  geocodeAddress,
  resolveAdmissionFeesForStops,
  searchTouristSpots,
} from '@/lib/google/places'
import type { PoiPlace } from '@/lib/google/types'
import {
  DESTINATION_RADIUS_KM,
  filterPlacesNearDestinations,
  orderStopsTowardDestinations,
  selectPlacesNearDestination,
  type LatLng,
} from '@/lib/maps/route-corridor'
import { isNavitimeConfigured } from '@/lib/navitime/config'
import { PREFECTURE_META } from '@/lib/plan/prefecture-meta'
import {
  insertDriverChangeStops,
  isTouristStop,
} from '@/lib/poi/rest-area'
import {
  fetchNavitimeCarRouteWithFallback,
  resolveParkingFeeDetailsWithFallback,
} from '@/lib/external/fallback'
import type { ParkingFeeResult } from '@/lib/navitime/parking'
import { resolveFuelPriceForVehicle } from '@/lib/prices/fuel'
import {
  buildCostBreakdown,
  sumCostBreakdown,
} from '@/lib/routes/cost-estimate'
import { aggregateParkingSource } from '@/lib/routes/cost-sources'
import { collectDegradedReasons, type DegradedReason } from '@/lib/routes/degraded'
import {
  buildDestinationStopsAsPlaces,
  buildDirectRouteSummary,
  isDestinationRoutingStop,
  isDirectRoute,
} from '@/lib/routes/cost-focused-plan'
import { buildFallbackRoutePlans } from '@/lib/routes/plan-fallback'
import type {
  RouteGenerateRequest,
  RouteSearchResult,
  RouteStop,
} from '@/lib/routes/types'

export function isRouteGenerationConfigured(): boolean {
  return isGoogleCloudConfigured() && isNavitimeConfigured()
}

async function searchTouristSpotsWithCache(
  prefecture: string,
  preferences: string[] = []
): Promise<{ places: PoiPlace[]; fromCache: boolean }> {
  const cached = await getCachedPlacesByPrefecture(prefecture, preferences)
  if (cached?.length) {
    return { places: cached, fromCache: true }
  }

  try {
    const places = await searchTouristSpots(prefecture, preferences)
    if (places.length > 0) {
      await setCachedPlacesByPrefecture(prefecture, preferences, places)
    }
    return { places, fromCache: false }
  } catch (error) {
    if (cached?.length) {
      console.warn('Places API failed, using cached POI data:', error)
      return { places: cached, fromCache: true }
    }
    throw error
  }
}

async function searchTouristSpotsForPrefecturesWithCache(
  prefectures: string[],
  preferences: string[] = []
): Promise<{ places: PoiPlace[]; usedCacheFallback: boolean }> {
  const results = await Promise.all(
    prefectures.map((prefecture) =>
      searchTouristSpotsWithCache(prefecture, preferences)
    )
  )

  const seen = new Set<string>()
  const merged: PoiPlace[] = []
  let usedCacheFallback = false

  for (const result of results) {
    if (result.fromCache) usedCacheFallback = true
    for (const place of result.places) {
      if (seen.has(place.id)) continue
      seen.add(place.id)
      merged.push(place)
    }
  }

  return {
    places: merged.slice(0, 20),
    usedCacheFallback,
  }
}

async function buildDestinationPoints(
  prefectures: string[]
): Promise<LatLng[]> {
  const destinations: LatLng[] = []

  for (const prefecture of prefectures) {
    // 都道府県はメタ座標を優先（Places 枠を消費しない）
    const meta = PREFECTURE_META[prefecture]
    if (meta) {
      destinations.push({ lat: meta.lat, lng: meta.lng })
      continue
    }
    const point = await geocodeAddress(prefecture)
    if (point) destinations.push(point)
  }

  return destinations
}

function filterTouristStopsNearDestination(
  stops: PoiPlace[],
  destinations: LatLng[],
  origin: LatLng
): PoiPlace[] {
  const touristStops = stops.filter(isTouristStop)
  const breakStops = stops.filter((stop) => !isTouristStop(stop))

  let filtered = filterPlacesNearDestinations(
    touristStops,
    destinations,
    DESTINATION_RADIUS_KM
  )

  if (filtered.length === 0) {
    filtered = filterPlacesNearDestinations(
      touristStops,
      destinations,
      DESTINATION_RADIUS_KM * 1.5
    )
  }

  if (filtered.length === 0) {
    filtered = touristStops
  }

  const orderedTourist = orderStopsTowardDestinations(
    origin,
    destinations,
    filtered
  )

  return [...breakStops, ...orderedTourist]
}

function mapStopsForResponse(
  stops: PoiPlace[],
  parkingFees: ParkingFeeResult[],
  admissionByPlaceId: Map<string, number>
): RouteStop[] {
  const parkingByPlaceId = new Map(
    parkingFees.map((fee) => [fee.place_id, fee])
  )

  return stops.map((stop) => {
    const parking = parkingByPlaceId.get(stop.id)
    return {
      place_id: stop.id,
      name: stop.name,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      category: stop.category,
      is_rest_stop: !isTouristStop(stop),
      stay_minutes: parking?.stay_minutes ?? 60,
      parking_yen: parking?.total_yen ?? 0,
      parking_source: parking?.source ?? 'estimate',
      admission_yen_per_person: admissionByPlaceId.get(stop.id) ?? 0,
    }
  })
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

function visibleStopsForRoute(
  pathStops: PoiPlace[],
  directRoute: boolean
): PoiPlace[] {
  if (!directRoute) return pathStops
  // 直行プランは運転交代の休憩所のみ表示（観光地・目的地ウェイポイントは除外）
  return pathStops.filter(
    (stop) =>
      !isDestinationRoutingStop(stop.id) && !isTouristStop(stop)
  )
}

export async function generateRoutes(
  request: RouteGenerateRequest
): Promise<RouteSearchResult> {
  if (!isGoogleCloudConfigured()) {
    throw new Error('GOOGLE_CLOUD_API_KEY を .env.local に設定してください')
  }

  if (!isNavitimeConfigured()) {
    throw new Error(
      'RAPIDAPI_KEY / RAPIDAPI_HOST を .env.local に設定してください'
    )
  }

  const { places, usedCacheFallback } =
    await searchTouristSpotsForPrefecturesWithCache(
      request.prefecture,
      request.preferences ?? []
    )

  if (places.length === 0) {
    throw new Error(
      `${request.prefecture.join('、')} で観光スポットが見つかりませんでした`
    )
  }

  const originLatLng = await geocodeAddress(request.origin)
  if (!originLatLng) {
    throw new Error(`出発地「${request.origin}」の位置情報を取得できませんでした`)
  }

  const destinations = await buildDestinationPoints(request.prefecture)
  if (destinations.length === 0) {
    throw new Error(
      `${request.prefecture.join('、')} の位置情報を取得できませんでした`
    )
  }

  const routePlaces = selectPlacesNearDestination(places, destinations)

  if (routePlaces.length === 0) {
    throw new Error(
      `${request.prefecture.join('、')} の周辺で観光スポットが見つかりませんでした`
    )
  }

  let plans
  let geminiUsed = false

  const fuelPrice = await resolveFuelPriceForVehicle(
    request.prefecture[0] ?? '東京都',
    request.vehicle
  )

  if (isGeminiConfigured()) {
    try {
      plans = await planRoutesWithGemini(request, routePlaces)
      geminiUsed = true
    } catch (error) {
      console.warn('Gemini route planning failed, using fallback:', error)
      plans = buildFallbackRoutePlans(request, routePlaces, originLatLng, destinations)
    }
  } else {
    plans = buildFallbackRoutePlans(request, routePlaces, originLatLng, destinations)
  }

  const routeDegradedReasons: DegradedReason[] = []
  const maxDriveMin = request.options?.max_drive_min ?? 120
  const useHighway = request.options?.use_highway !== false
  const roundTrip = request.options?.round_trip === true

  const routes = await Promise.all(
    plans.routes.slice(0, 3).map(async (plan) => {
      const directRoute = isDirectRoute(plan.id)

      let pathStops: PoiPlace[] = directRoute
        ? buildDestinationStopsAsPlaces(request.prefecture, destinations)
        : resolveStopsFromPlan(
            plan,
            routePlaces,
            destinations,
            originLatLng
          )

      if (!directRoute) {
        pathStops = filterTouristStopsNearDestination(
          pathStops,
          destinations,
          originLatLng
        )
      }

      let navitime = await fetchNavitimeCarRouteWithFallback({
        request,
        routeId: plan.id,
        origin: originLatLng,
        stops: toNavitimeStops(pathStops),
      })

      if (navitime.degraded && navitime.degraded_reason) {
        routeDegradedReasons.push(navitime.degraded_reason)
      }

      if (maxDriveMin > 0) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const withDriverChangeStops = await insertDriverChangeStops(
            pathStops,
            navitime.sections,
            maxDriveMin,
            directRoute ? true : useHighway,
            originLatLng,
            roundTrip
          )

          if (withDriverChangeStops.length === pathStops.length) break

          pathStops = withDriverChangeStops
          navitime = await fetchNavitimeCarRouteWithFallback({
            request,
            routeId: plan.id,
            origin: originLatLng,
            stops: toNavitimeStops(pathStops),
          })
          if (navitime.degraded && navitime.degraded_reason) {
            routeDegradedReasons.push(navitime.degraded_reason)
          }
        }
      }

      const responsePathStops = visibleStopsForRoute(pathStops, directRoute)
      const touristStops = responsePathStops.filter(isTouristStop)
      const admissionFeesPerPerson = directRoute
        ? []
        : await resolveAdmissionFeesForStops(touristStops)
      const admissionByPlaceId = new Map(
        touristStops.map((stop, index) => [
          stop.id,
          admissionFeesPerPerson[index] ?? 0,
        ])
      )

      const parkingFees = directRoute
        ? []
        : await resolveParkingFeeDetailsWithFallback(
            responsePathStops.map((stop) => ({
              id: stop.id,
              name: stop.name,
              lat: stop.lat,
              lng: stop.lng,
              category: stop.category,
            })),
            navitime.degraded
          )
      const parkingYen = parkingFees.reduce(
        (total, fee) => total + fee.total_yen,
        0
      )

      const costBreakdown = directRoute
        ? {
            fuel: 0,
            toll: navitime.tollYen,
            parking: 0,
            admission: 0,
          }
        : buildCostBreakdown(
            request,
            navitime.distanceKm,
            navitime.tollYen,
            admissionFeesPerPerson,
            parkingYen,
            fuelPrice.price_yen
          )
      const totalCost = sumCostBreakdown(costBreakdown)
      const responseStops = mapStopsForResponse(
        responsePathStops,
        parkingFees,
        admissionByPlaceId
      )

      return {
        id: plan.id,
        title: plan.title,
        summary: directRoute
          ? buildDirectRouteSummary(plan.id, request)
          : plan.summary,
        transport_mode: 'car' as const,
        stops: responseStops,
        polyline: navitime.polyline,
        sections: navitime.sections,
        cost_breakdown: costBreakdown,
        cost_sources: directRoute
          ? {
              fuel: undefined,
              toll: navitime.degraded ? ('estimate' as const) : ('navitime' as const),
              parking: undefined,
              admission: undefined,
            }
          : {
              fuel: fuelPrice.source,
              toll: navitime.degraded ? ('estimate' as const) : ('navitime' as const),
              parking: aggregateParkingSource(responseStops),
              admission: 'places' as const,
            },
        total_distance_km: navitime.distanceKm,
        total_duration_min: navitime.durationMin,
        total_cost: totalCost,
        cost_per_person: Math.round(totalCost / request.people),
        departure_time: navitime.departureTime,
        arrival_time: navitime.arrivalTime,
        round_trip: roundTrip,
      }
    })
  )

  const degraded_reasons = collectDegradedReasons(
    fuelPrice.degraded ? 'government_fuel' : null,
    !geminiUsed ? 'gemini' : null,
    usedCacheFallback ? 'places_cache' : null,
    routeDegradedReasons
  )

  return {
    generated_at: new Date().toISOString(),
    routes,
    gemini_used: geminiUsed,
    ...(degraded_reasons.length > 0
      ? { degraded: true, degraded_reasons }
      : {}),
  }
}
