import type { RouteCandidate } from '@/lib/routes/types'

export type LatLng = { lat: number; lng: number }

export function collectRoutePoints(routes: RouteCandidate[]): LatLng[] {
  const points: LatLng[] = []

  for (const route of routes) {
    for (const point of route.polyline) {
      points.push({ lat: point.lat, lng: point.lng })
    }
    for (const stop of route.stops) {
      points.push({ lat: stop.lat, lng: stop.lng })
    }
  }

  return points
}

export function getDefaultMapCenter(routes: RouteCandidate[]): LatLng {
  const first = routes[0]?.polyline[0] ?? routes[0]?.stops[0]
  return first ? { lat: first.lat, lng: first.lng } : { lat: 35.0116, lng: 135.7681 }
}
