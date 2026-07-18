import { isDriverChangeCategory, parseDriveLegDurations } from '@/lib/poi/rest-area'
import type { RouteCandidate, RouteSection } from '@/lib/routes/types'

export type LatLng = { lat: number; lng: number }

export type RoundTripStop = LatLng & {
  is_rest_stop?: boolean
  category?: string
}

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

export type RoundTripLeg = 'outbound' | 'return'

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

function isTouristRouteStop(stop: RoundTripStop): boolean {
  if (stop.is_rest_stop === true) return false
  if (stop.category != null && isDriverChangeCategory(stop.category)) return false
  return true
}

/**
 * 帰り道の開始位置（polyline 上のインデックス）。
 * 最後に訪れる観光地付近で分割し、帰りの休憩所は帰り色に含める。
 */
function findRoundTripSplitIndex(
  polyline: LatLng[],
  stops: RoundTripStop[] = []
): number {
  const origin = polyline[0]
  const touristStops = stops.filter(isTouristRouteStop)

  if (touristStops.length > 0) {
    let splitIndex = 0
    for (const stop of touristStops) {
      const nearest = findNearestPolylineIndex(polyline, stop)
      if (nearest > splitIndex) splitIndex = nearest
    }
    if (splitIndex > 0 && splitIndex < polyline.length - 1) {
      return splitIndex
    }
  }

  return findFarthestPolylineIndex(polyline, origin)
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
 * 最後に訪れる観光地付近で折り返しとみなし、そこから出発地までは帰り色にする。
 */
export function splitRoundTripPolyline(
  polyline: LatLng[],
  stops: RoundTripStop[] = []
): RoundTripLegs | null {
  if (polyline.length < 3) return null

  const splitIndex = findRoundTripSplitIndex(polyline, stops)

  if (splitIndex <= 0 || splitIndex >= polyline.length - 1) {
    return null
  }

  return {
    outbound: polyline.slice(0, splitIndex + 1),
    returnLeg: polyline.slice(splitIndex),
  }
}

export type RoundTripLegDurations = {
  outboundMin: number
  returnMin: number
}

function polylineLengthKm(points: LatLng[]): number {
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += haversineKm(points[i - 1], points[i])
  }
  return total
}

function findLastOutboundStopIndex(stopLegs: RoundTripLeg[]): number {
  let lastOutboundStopIndex = -1
  for (let i = 0; i < stopLegs.length; i += 1) {
    if (stopLegs[i] === 'outbound') lastOutboundStopIndex = i
  }
  return lastOutboundStopIndex
}

function computeLegDurationsFromPolylineRatio(
  polyline: LatLng[],
  stops: RoundTripStop[],
  totalDurationMin: number
): RoundTripLegDurations | null {
  if (polyline.length < 3 || totalDurationMin <= 0) return null

  const splitIndex = findRoundTripSplitIndex(polyline, stops)
  const outboundKm = polylineLengthKm(polyline.slice(0, splitIndex + 1))
  const returnKm = polylineLengthKm(polyline.slice(splitIndex))
  const totalKm = outboundKm + returnKm

  if (totalKm <= 0) {
    const half = Math.round(totalDurationMin / 2)
    return { outboundMin: half, returnMin: totalDurationMin - half }
  }

  const outboundMin = Math.round(totalDurationMin * (outboundKm / totalKm))
  return {
    outboundMin,
    returnMin: totalDurationMin - outboundMin,
  }
}

/** 往復ルートの行き・帰り所要時間（分） */
export function computeRoundTripLegDurations(
  route: Pick<
    RouteCandidate,
    'polyline' | 'stops' | 'sections' | 'total_duration_min'
  >
): RoundTripLegDurations | null {
  const { polyline, stops, sections, total_duration_min } = route
  if (polyline.length < 3 || stops.length === 0) return null

  const stopLegs = buildRoundTripStopLegs(polyline, stops)
  const lastOutboundStopIndex = findLastOutboundStopIndex(stopLegs)
  if (lastOutboundStopIndex < 0) return null

  const origin = polyline[0]
  const waypoints = [
    origin,
    ...stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
    origin,
  ]
  const legDurations = parseDriveLegDurations(
    (sections ?? []) as RouteSection[],
    waypoints
  )

  if (legDurations.length >= stops.length + 1) {
    const outboundMin = legDurations
      .slice(0, lastOutboundStopIndex + 1)
      .reduce((sum, duration) => sum + duration, 0)
    const returnMin = legDurations
      .slice(lastOutboundStopIndex + 1)
      .reduce((sum, duration) => sum + duration, 0)

    if (outboundMin > 0 || returnMin > 0) {
      return { outboundMin, returnMin }
    }
  }

  return computeLegDurationsFromPolylineRatio(
    polyline,
    stops,
    total_duration_min
  )
}

export function formatDurationMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins}分`
  if (mins === 0) return `${hours}時間`
  return `${hours}時間${mins}分`
}

/** 片道は総時間、往復は「行 X · 帰 Y」形式 */
export function formatRouteDuration(
  route: Pick<
    RouteCandidate,
    'round_trip' | 'polyline' | 'stops' | 'sections' | 'total_duration_min'
  >
): string {
  if (!isRoundTripRoute(route)) {
    return formatDurationMinutes(route.total_duration_min)
  }

  const legs = computeRoundTripLegDurations(route)
  if (!legs) return formatDurationMinutes(route.total_duration_min)

  return `行 ${formatDurationMinutes(legs.outboundMin)} · 帰 ${formatDurationMinutes(legs.returnMin)}`
}

/** 各停留地が行き道・帰り道のどちらに属するか */
export function buildRoundTripStopLegs(
  polyline: LatLng[],
  stops: RoundTripStop[] = []
): RoundTripLeg[] {
  if (polyline.length < 3 || stops.length === 0) return []

  const splitIndex = findRoundTripSplitIndex(polyline, stops)

  return stops.map((stop) => {
    const nearest = findNearestPolylineIndex(polyline, stop)
    return nearest > splitIndex ? 'return' : 'outbound'
  })
}

/** 行き/帰りそれぞれの通し番号（1 始まり） */
export function roundTripStopNumber(
  legs: RoundTripLeg[],
  stopIndex: number
): number {
  const leg = legs[stopIndex]
  if (!leg) return stopIndex + 1

  let number = 0
  for (let i = 0; i <= stopIndex; i += 1) {
    if (legs[i] === leg) number += 1
  }
  return number
}

/** 地図マーカー・ツールチップ用の行き/帰りラベル */
export function roundTripStopTitlePrefix(
  legs: RoundTripLeg[],
  stopIndex: number
): string {
  const leg = legs[stopIndex]
  if (!leg) return ''
  const number = roundTripStopNumber(legs, stopIndex)
  return leg === 'return' ? `帰り ${number}. ` : `行き ${number}. `
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
  roundTrip: boolean,
  leg?: RoundTripLeg
): string {
  if (!roundTrip) return '#2563eb'
  switch (kind) {
    case 'departure':
      return ROUND_TRIP_OUTBOUND_COLOR
    case 'arrival':
      return ROUND_TRIP_RETURN_COLOR
    case 'stop':
      return leg === 'return'
        ? ROUND_TRIP_RETURN_COLOR
        : ROUND_TRIP_OUTBOUND_COLOR
  }
}
