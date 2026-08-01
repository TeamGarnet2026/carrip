import type { PoiPlace } from '@/lib/google/types'
import type { LatLng } from '@/lib/maps/route-corridor'
import type { RouteGenerateRequest } from '@/lib/routes/types'

export const COST_FOCUSED_ROUTE_ID = 'route-1'
export const BALANCED_ROUTE_ID = 'route-2'

/** 観光地なし・目的地直行（運転交代休憩のみ可） */
export function isDirectRoute(routeId: string): boolean {
  return routeId === COST_FOCUSED_ROUTE_ID || routeId === BALANCED_ROUTE_ID
}

/** @deprecated isDirectRoute を使用 */
export function isCostFocusedRoute(routeId: string): boolean {
  return routeId === COST_FOCUSED_ROUTE_ID
}

/** コスト重視は一般道、それ以外は高速道路を利用 */
export function usesHighwayForRoute(routeId: string): boolean {
  return !isCostFocusedRoute(routeId)
}

export function isDestinationRoutingStop(stopId: string): boolean {
  return stopId.startsWith('destination-')
}

export function buildDestinationRoutingStops(
  prefectures: string[],
  destinations: LatLng[]
): Array<{ id: string; name: string; lat: number; lng: number }> {
  return destinations.map((destination, index) => ({
    id: `destination-${index}`,
    name: prefectures[index] ?? `目的地${index + 1}`,
    lat: destination.lat,
    lng: destination.lng,
  }))
}

/** ルート探索・運転交代挿入用（UI には出さない目的地ウェイポイント） */
export function buildDestinationStopsAsPlaces(
  prefectures: string[],
  destinations: LatLng[]
): PoiPlace[] {
  return buildDestinationRoutingStops(prefectures, destinations).map(
    (stop) => ({
      id: stop.id,
      name: stop.name,
      address: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      category: 'destination',
    })
  )
}

export function buildDirectRouteSummary(
  routeId: string,
  request: RouteGenerateRequest
): string {
  const dest = request.prefecture.join('・')
  if (routeId === BALANCED_ROUTE_ID) {
    return `${request.origin} から ${dest} まで高速道路のみで直行（観光地の立ち寄りなし）。所要時間と走行のバランスを重視した ${request.days} 日のプランです。`
  }
  return `${request.origin} から ${dest} まで一般道のみで直行（高速道路なし・観光地の立ち寄りなし）。高速料金を抑えた ${request.days} 日のプランです。`
}

/** @deprecated buildDirectRouteSummary を使用 */
export function buildCostFocusedSummary(request: RouteGenerateRequest): string {
  return buildDirectRouteSummary(COST_FOCUSED_ROUTE_ID, request)
}
