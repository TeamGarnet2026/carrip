import type { RouteCandidate } from '@/lib/routes/types'

export type LatLng = { lat: number; lng: number }

/** 行きルート線の色 */
export const ROUND_TRIP_OUTBOUND_COLOR = '#0d9488'

/** 帰りルート線の色 */
export const ROUND_TRIP_RETURN_COLOR = '#f59e0b'

/** 往復とみなす polyline 始点・終点の距離上限（km） */
export const ROUND_TRIP_ENDPOINT_THRESHOLD_KM = 5

export type RoundTripLegs = {
  outbound: LatLng[]
  returnLeg: LatLng[]
}

function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const r = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sin =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return r * 2 * Math.atan2(Math.sqrt(sin), Math.sqrt(1 - sin))
}

function findNearestPolylineIndex(polyline: LatLng[], point: LatLng): number {
  let nearestIndex = 0
  let nearestDistance = Infinity

  for (let i = 0; i < polyline.length; i += 1) {
    const distance = haversineKm(polyline[i], point)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = i
    }
  }

  return nearestIndex
}

function findFarthestPolylineIndex(polyline: LatLng[], origin: LatLng): number {
  let farthestIndex = 0
  let farthestDistance = 0

  for (let i = 0; i < polyline.length; i += 1) {
    const distance = haversineKm(origin, polyline[i])
    if (distance >= farthestDistance) {
      farthestDistance = distance
      farthestIndex = i
    }
  }

  return farthestIndex
}

/** 往復ルートか（明示フラグ or polyline 始終点が近い） */
export function isRoundTripRoute(
  route: Pick<RouteCandidate, 'round_trip' | 'polyline'>
): boolean {
  if (route.round_trip === true) return true
  if (route.round_trip === false) return false

  const { polyline } = route
  if (polyline.length < 2) return false

  const start = polyline[0]
  const end = polyline[polyline.length - 1]
  return haversineKm(start, end) <= ROUND_TRIP_ENDPOINT_THRESHOLD_KM
}

/**
 * 往復ルートの polyline を行き・帰りに分割。
 * 最終立ち寄り地点付近、なければ出発地から最も遠い点で折り返しとみなす。
 */
export function splitRoundTripPolyline(
  polyline: LatLng[],
  stops: Array<Pick<LatLng, 'lat' | 'lng'>> = []
): RoundTripLegs | null {
  if (polyline.length < 3) return null

  const origin = polyline[0]
  let splitIndex = findFarthestPolylineIndex(polyline, origin)

  if (stops.length > 0) {
    const lastStop = stops[stops.length - 1]
    const nearLastStop = findNearestPolylineIndex(polyline, lastStop)
    if (nearLastStop > 0 && nearLastStop < polyline.length - 1) {
      splitIndex = nearLastStop
    }
  }

  if (splitIndex <= 0 || splitIndex >= polyline.length - 1) {
    return null
  }

  return {
    outbound: polyline.slice(0, splitIndex + 1),
    returnLeg: polyline.slice(splitIndex),
  }
}

/** 始点と終点が同じ付近か（発着マーカーを1つにまとめる） */
export function isSameDepartureArrival(polyline: LatLng[]): boolean {
  if (polyline.length < 2) return true
  return (
    haversineKm(polyline[0], polyline[polyline.length - 1]) <= 0.5
  )
}

export type MapMarkerKind = 'departure' | 'arrival' | 'stop'

export function mapMarkerLabel(
  kind: MapMarkerKind,
  stopIndex?: number
): string {
  switch (kind) {
    case 'departure':
      return '発'
    case 'arrival':
      return '帰'
    case 'stop':
      return String((stopIndex ?? 0) + 1)
  }
}

export function mapMarkerColor(
  kind: MapMarkerKind,
  roundTrip: boolean
): string {
  if (!roundTrip) return '#2563eb'
  switch (kind) {
    case 'departure':
      return ROUND_TRIP_OUTBOUND_COLOR
    case 'arrival':
      return ROUND_TRIP_RETURN_COLOR
    case 'stop':
      return ROUND_TRIP_OUTBOUND_COLOR
  }
}
