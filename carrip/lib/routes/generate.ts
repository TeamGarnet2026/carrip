import {
  planRoutesWithGemini,
  resolveStopsFromPlan,
} from '@/lib/gemini/route-planner'
import {
  isGeminiConfigured,
  isGoogleCloudConfigured,
} from '@/lib/google/config'
import { geocodeAddress, resolveAdmissionFeesForStops, searchTouristSpotsForPrefectures } from '@/lib/google/places'
import { isNavitimeConfigured } from '@/lib/navitime/config'
import { fetchNavitimeCarRoute } from '@/lib/navitime/route-car'
import {
  buildCostBreakdown,
  sumCostBreakdown,
} from '@/lib/routes/cost-estimate'
import { buildFallbackRoutePlans } from '@/lib/routes/plan-fallback'
import type {
  RouteGenerateRequest,
  RouteSearchResult,
} from '@/lib/routes/types'

export function isRouteGenerationConfigured(): boolean {
  return isGoogleCloudConfigured() && isNavitimeConfigured()
}

export async function generateRoutes(
  request: RouteGenerateRequest
): Promise<RouteSearchResult & { degraded?: boolean }> {
  if (!isGoogleCloudConfigured()) {
    throw new Error('GOOGLE_CLOUD_API_KEY を .env.local に設定してください')
  }

  if (!isNavitimeConfigured()) {
    throw new Error(
      'RAPIDAPI_KEY / RAPIDAPI_HOST を .env.local に設定してください'
    )
  }

  const places = await searchTouristSpotsForPrefectures(
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

  let degraded = !geminiUsed

  const routes = await Promise.all(
    plans.routes.slice(0, 3).map(async (plan) => {
      const stops = resolveStopsFromPlan(plan, places)
      const admissionFeesPerPerson = await resolveAdmissionFeesForStops(stops)
      const navitime = await fetchNavitimeCarRoute({
        request,
        routeId: plan.id,
        origin: originLatLng,
        stops: stops.map((stop) => ({
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
        })),
      })

      const costBreakdown = buildCostBreakdown(
        request,
        navitime.distanceKm,
        stops.length,
        navitime.tollYen,
        admissionFeesPerPerson
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

  return {
    generated_at: new Date().toISOString(),
    routes,
    gemini_used: geminiUsed,
    ...(degraded ? { degraded: true } : {}),
  }
}
