import type { GeminiRoutePlansResponse, PoiPlace } from '@/lib/google/types'
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
    { id: 'route-1', title: 'コスト重視ルート', count: 2 },
    { id: 'route-2', title: 'バランスタイプ', count: 3 },
    { id: 'route-3', title: '景観重視ルート', count: 4 },
  ] as const

  return {
    routes: variants.map((variant) => {
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
