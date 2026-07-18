import type { GeminiRoutePlansResponse, PoiPlace } from '@/lib/google/types'
import {
  BALANCED_ROUTE_ID,
  buildDirectRouteSummary,
  COST_FOCUSED_ROUTE_ID,
  isDirectRoute,
} from '@/lib/routes/cost-focused-plan'
import {
  orderStopsTowardDestinations,
  selectPlacesNearDestination,
  type LatLng,
} from '@/lib/maps/route-corridor'
import type { RouteGenerateRequest } from '@/lib/routes/types'

function buildSummary(
  title: string,
  stops: PoiPlace[],
  request: RouteGenerateRequest
): string {
  const names = stops.map((s) => s.name).join('、')
  return `${request.origin} から ${request.prefecture.join('・')} 方面へ。${title}として ${names} を巡る ${request.days} 日のプランです。`
}

function selectStopsNearDestination(
  places: PoiPlace[],
  destinations: LatLng[],
  count: number
): PoiPlace[] {
  const nearDestination = selectPlacesNearDestination(places, destinations)
  return nearDestination.slice(0, Math.min(count, nearDestination.length))
}

export function buildFallbackRoutePlans(
  request: RouteGenerateRequest,
  places: PoiPlace[],
  origin: LatLng,
  destinations: LatLng[]
): GeminiRoutePlansResponse {
  const variants = [
    { id: COST_FOCUSED_ROUTE_ID, title: 'コスト重視ルート', count: 0 },
    { id: BALANCED_ROUTE_ID, title: 'バランスタイプ', count: 0 },
    { id: 'route-3', title: '景観重視ルート', count: 4 },
  ] as const

  return {
    routes: variants.map((variant) => {
      if (isDirectRoute(variant.id)) {
        return {
          id: variant.id,
          title: variant.title,
          summary: buildDirectRouteSummary(variant.id, request),
          stop_place_ids: [],
        }
      }

      const stops = orderStopsTowardDestinations(
        origin,
        destinations,
        selectStopsNearDestination(places, destinations, variant.count)
      )
      return {
        id: variant.id,
        title: variant.title,
        summary: buildSummary(variant.title, stops, request),
        stop_place_ids: stops.map((s) => s.id),
      }
    }),
  }
}
