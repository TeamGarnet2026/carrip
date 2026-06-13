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
import { isNavitimeConfigured } from '@/lib/navitime/config'
import { insertRestAreasIntoStops } from '@/lib/poi/rest-area'
import {
  fetchNavitimeCarRouteWithFallback,
  resolveParkingFeesWithFallback,
} from '@/lib/external/fallback'
import { resolveFuelPriceForVehicle } from '@/lib/prices/fuel'
import {
  buildCostBreakdown,
  sumCostBreakdown,
} from '@/lib/routes/cost-estimate'
import { collectDegradedReasons, type DegradedReason } from '@/lib/routes/degraded'
import { buildFallbackRoutePlans } from '@/lib/routes/plan-fallback'
import type {
  RouteGenerateRequest,
  RouteSearchResult,
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

  let plans
  let geminiUsed = false

  const fuelPrice = await resolveFuelPriceForVehicle(
    request.prefecture[0] ?? '東京都',
    request.vehicle
  )

  if (isGeminiConfigured()) {
    try {
      plans = await planRoutesWithGemini(request, places)
      geminiUsed = true
    } catch (error) {
      console.warn('Gemini route planning failed, using fallback:', error)
      plans = buildFallbackRoutePlans(request, places)
    }
  } else {
    plans = buildFallbackRoutePlans(request, places)
  }

  const routeDegradedReasons: DegradedReason[] = []
  const maxDriveMin = request.options?.max_drive_min

  const routes = await Promise.all(
    plans.routes.slice(0, 3).map(async (plan) => {
      let stops = resolveStopsFromPlan(plan, places)
      const admissionFeesPerPerson = await resolveAdmissionFeesForStops(stops)

      let navitime = await fetchNavitimeCarRouteWithFallback({
        request,
        routeId: plan.id,
        origin: originLatLng,
        stops: stops.map((stop) => ({
          id: stop.id,
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          category: stop.category,
        })),
      })

      if (navitime.degraded && navitime.degraded_reason) {
        routeDegradedReasons.push(navitime.degraded_reason)
      }

      if (maxDriveMin) {
        const withRestAreas = await insertRestAreasIntoStops(
          stops,
          navitime.sections,
          maxDriveMin
        )

        if (withRestAreas.length > stops.length) {
          stops = withRestAreas
          navitime = await fetchNavitimeCarRouteWithFallback({
            request,
            routeId: plan.id,
            origin: originLatLng,
            stops: stops.map((stop) => ({
              id: stop.id,
              name: stop.name,
              lat: stop.lat,
              lng: stop.lng,
              category: stop.category,
            })),
          })
          if (navitime.degraded && navitime.degraded_reason) {
            routeDegradedReasons.push(navitime.degraded_reason)
          }
        }
      }

      const parkingYen = await resolveParkingFeesWithFallback(
        stops.map((stop) => ({
          id: stop.id,
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          category: stop.category,
        })),
        navitime.degraded
      )

      const costBreakdown = buildCostBreakdown(
        request,
        navitime.distanceKm,
        navitime.tollYen,
        admissionFeesPerPerson,
        parkingYen,
        fuelPrice.price_yen
      )
      const totalCost = sumCostBreakdown(costBreakdown)

      return {
        id: plan.id,
        title: plan.title,
        summary: plan.summary,
        transport_mode: 'car' as const,
        stops: stops.map((stop) => ({
          place_id: stop.id,
          name: stop.name,
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
        })),
        polyline: navitime.polyline,
        sections: navitime.sections,
        cost_breakdown: costBreakdown,
        total_distance_km: navitime.distanceKm,
        total_duration_min: navitime.durationMin,
        total_cost: totalCost,
        cost_per_person: Math.round(totalCost / request.people),
        departure_time: navitime.departureTime,
        arrival_time: navitime.arrivalTime,
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
