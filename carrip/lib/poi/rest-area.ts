import { getCachedPoiSearch, setCachedPoiSearch } from '@/lib/cache/poi-cache'
import type { PoiPlace } from '@/lib/google/types'
import { haversineKm, type LatLng } from '@/lib/maps/route-corridor'
import type { RouteSection } from '@/lib/routes/types'
import { searchPlacesByText } from '@/lib/poi/search'

export type DriverChangeCategory =
  | 'service_area'
  | 'parking_area'
  | 'rest_area'
  | 'convenience_store'

export type DriverChangeStop = PoiPlace & {
  category: DriverChangeCategory
}

const DRIVER_CHANGE_CATEGORIES = new Set<string>([
  'service_area',
  'parking_area',
  'rest_area',
  'convenience_store',
])

const DUPLICATE_REST_STOP_RADIUS_KM = 2

/** 走行ルートからこれ以上離れた候補は寄り道になるため採用しない */
const MAX_OFF_ROUTE_KM_LOCAL = 1
const MAX_OFF_ROUTE_KM_HIGHWAY = 1.5

/** 候補が見つからないときに探す地点をずらす量（区間に対する割合）。運転上限を超えにくいよう手前を優先 */
const FRACTION_RETRY_OFFSETS = [0, -0.1, 0.08, -0.2]

/** 高速の反対車線の施設は出入りに大回りが必要なため採用しない。一般道は右折の手間程度なので軽く減点 */
const RIGHT_SIDE_PENALTY_HIGHWAY = Infinity
const RIGHT_SIDE_PENALTY_LOCAL = 0.3

export type DriverChangeInsertion = {
  legIndex: number
  fraction: number
}

export function isDriverChangeCategory(
  category?: string | null
): category is DriverChangeCategory {
  return category != null && DRIVER_CHANGE_CATEGORIES.has(category)
}

export function isTouristStop(stop: PoiPlace): boolean {
  return !isDriverChangeCategory(stop.category)
}

export function parseDriveLegDurations(
  sections: RouteSection[],
  waypoints: LatLng[]
): number[] {
  const legDurations: number[] = []
  let current = 0

  for (const section of sections) {
    if (section.type === 'move') {
      current += section.duration_min ?? 0
      continue
    }

    if (section.type === 'point') {
      legDurations.push(current)
      current = 0
    }
  }

  if (current > 0) {
    legDurations.push(current)
  }

  const expectedLegs = Math.max(waypoints.length - 1, 0)
  if (expectedLegs === 0) return []
  if (legDurations.length === expectedLegs) return legDurations

  const totalMoveMin = sections
    .filter((section) => section.type === 'move')
    .reduce((sum, section) => sum + (section.duration_min ?? 0), 0)

  return splitDurationByWaypointDistance(waypoints, totalMoveMin)
}

function splitDurationByWaypointDistance(
  waypoints: LatLng[],
  totalMin: number
): number[] {
  if (waypoints.length < 2) return []

  const distances = waypoints.slice(0, -1).map((from, index) => {
    const to = waypoints[index + 1]
    return haversineKm(from.lat, from.lng, to.lat, to.lng)
  })

  const totalDistance = distances.reduce((sum, distance) => sum + distance, 0)
  if (totalDistance <= 0) {
    const even = totalMin / distances.length
    return distances.map(() => even)
  }

  return distances.map((distance) => (distance / totalDistance) * totalMin)
}

export function planDriverChangeInsertions(
  origin: LatLng,
  stops: LatLng[],
  sections: RouteSection[],
  maxDriveMin: number,
  roundTrip = false
): DriverChangeInsertion[] {
  if (maxDriveMin <= 0) return []

  const waypoints = roundTrip
    ? [origin, ...stops, origin]
    : [origin, ...stops]
  const legDurations = parseDriveLegDurations(sections, waypoints)
  const insertions: DriverChangeInsertion[] = []

  for (let legIndex = 0; legIndex < legDurations.length; legIndex += 1) {
    const legMin = legDurations[legIndex]
    if (legMin <= maxDriveMin) continue

    const insertionCount = Math.floor(legMin / maxDriveMin)
    for (let index = 1; index <= insertionCount; index += 1) {
      const fraction = (index * maxDriveMin) / legMin
      if (fraction >= 1) continue
      insertions.push({ legIndex, fraction })
    }
  }

  return insertions
}

/** 走行ルートの形状と、各区間（地点→地点）が形状上のどこからどこまでかを表す */
type RoutePath = {
  points: LatLng[]
  cumulativeKm: number[]
  legRanges: Array<[number, number]>
}

function nearestPointIndex(points: LatLng[], target: LatLng, from: number): number {
  let bestIndex = from
  let bestDistance = Infinity
  for (let i = from; i < points.length; i += 1) {
    const distance = haversineKm(points[i].lat, points[i].lng, target.lat, target.lng)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = i
    }
  }
  return bestIndex
}

export function buildRoutePath(points: LatLng[], waypoints: LatLng[]): RoutePath | null {
  if (points.length < 2 || waypoints.length < 2) return null

  const cumulativeKm = [0]
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    cumulativeKm.push(
      cumulativeKm[i - 1] + haversineKm(prev.lat, prev.lng, points[i].lat, points[i].lng)
    )
  }

  const bounds = [0]
  for (let i = 1; i < waypoints.length - 1; i += 1) {
    bounds.push(nearestPointIndex(points, waypoints[i], bounds[i - 1]))
  }
  bounds.push(points.length - 1)

  const legRanges = bounds
    .slice(0, -1)
    .map((start, index): [number, number] => [start, bounds[index + 1]])

  return { points, cumulativeKm, legRanges }
}

function pointAlongLeg(path: RoutePath, legIndex: number, fraction: number) {
  const [start, end] = path.legRanges[legIndex]
  const { points, cumulativeKm } = path
  const clamped = Math.max(0, Math.min(1, fraction))
  const targetKm =
    cumulativeKm[start] + (cumulativeKm[end] - cumulativeKm[start]) * clamped

  for (let i = start; i < end; i += 1) {
    if (cumulativeKm[i + 1] < targetKm) continue
    const segmentKm = cumulativeKm[i + 1] - cumulativeKm[i]
    const t = segmentKm > 0 ? (targetKm - cumulativeKm[i]) / segmentKm : 0
    return {
      point: {
        lat: points[i].lat + (points[i + 1].lat - points[i].lat) * t,
        lng: points[i].lng + (points[i + 1].lng - points[i].lng) * t,
      },
      alongKm: targetKm,
    }
  }

  return { point: points[end], alongKm: cumulativeKm[end] }
}

/** 区間内で候補地点に最も近い道路上の位置（道路からの距離と、出発地からの走行距離） */
function locateOnLeg(path: RoutePath, legIndex: number, place: LatLng) {
  const [start, end] = path.legRanges[legIndex]
  const { points, cumulativeKm } = path

  if (start === end) {
    const p = points[start]
    return {
      offRouteKm: haversineKm(p.lat, p.lng, place.lat, place.lng),
      alongKm: cumulativeKm[start],
      onRightSide: false,
    }
  }

  const kmPerLat = 110.57
  const kmPerLng = 111.32 * Math.cos((place.lat * Math.PI) / 180)
  let best = {
    offRouteKm: Infinity,
    alongKm: cumulativeKm[start],
    onRightSide: false,
  }

  for (let i = start; i < end; i += 1) {
    const ax = (points[i].lng - place.lng) * kmPerLng
    const ay = (points[i].lat - place.lat) * kmPerLat
    const bx = (points[i + 1].lng - place.lng) * kmPerLng
    const by = (points[i + 1].lat - place.lat) * kmPerLat
    const dx = bx - ax
    const dy = by - ay
    const lengthSq = dx * dx + dy * dy
    const t =
      lengthSq > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq)) : 0
    const offRouteKm = Math.hypot(ax + dx * t, ay + dy * t)

    if (offRouteKm < best.offRouteKm) {
      best = {
        offRouteKm,
        alongKm:
          cumulativeKm[i] + (cumulativeKm[i + 1] - cumulativeKm[i]) * t,
        // 進行方向ベクトルと「道路→候補」ベクトルの外積が負なら右側
        onRightSide: dx * -(ay + dy * t) - dy * -(ax + dx * t) < 0,
      }
    }
  }

  return best
}

const inFlightNearbySearches = new Map<string, Promise<PoiPlace[]>>()

/**
 * Places Text Search は 1 日の上限が小さいため、約1km 四方のマス単位でキャッシュする。
 * 3 本のルートを並列計算すると同じ地点を同時に探すことがあるので、実行中の検索も共有する。
 */
async function searchPlacesNear(
  keyword: string,
  point: LatLng,
  radiusMeters: number
): Promise<PoiPlace[]> {
  const cacheKey = `poi:near:${keyword}:${point.lat.toFixed(2)},${point.lng.toFixed(2)}:${radiusMeters}`

  const cached = await getCachedPoiSearch(cacheKey)
  if (cached) return cached

  const inFlight = inFlightNearbySearches.get(cacheKey)
  if (inFlight) return inFlight

  const request = searchPlacesByText(keyword, {
    maxResultCount: 20,
    skipQualityFilter: true,
    locationBias: { lat: point.lat, lng: point.lng, radiusMeters },
  })
    .then(async (places) => {
      await setCachedPoiSearch(cacheKey, places)
      return places
    })
    .finally(() => inFlightNearbySearches.delete(cacheKey))

  inFlightNearbySearches.set(cacheKey, request)
  return request
}

async function searchHighwayRestCandidates(
  point: LatLng,
  preferParkingArea: boolean
): Promise<DriverChangeStop[]> {
  const keyword = preferParkingArea ? 'パーキングエリア PA' : 'サービスエリア SA'
  const places = await searchPlacesNear(keyword, point, 40000)

  const filtered = places.filter((place) =>
    preferParkingArea
      ? /PA|パーキング/i.test(place.name)
      : /SA|サービスエリア/i.test(place.name) && !/PA|パーキング/i.test(place.name)
  )

  return (filtered.length > 0 ? filtered : places).map((place) => ({
    ...place,
    category: /PA|パーキング/i.test(place.name) ? 'parking_area' : 'service_area',
  }))
}

async function searchConvenienceStoreCandidates(
  point: LatLng
): Promise<DriverChangeStop[]> {
  const places = await searchPlacesNear('コンビニ', point, 5000)

  const filtered = places.filter((place) =>
    /コンビニ|ファミリーマート|ローソン|セブン|ミニストップ|デイリーヤマザキ/i.test(
      place.name
    )
  )

  return (filtered.length > 0 ? filtered : places).map((place) => ({
    ...place,
    category: 'convenience_store',
  }))
}

/**
 * 道路から近い（寄り道が少ない）ことを最優先し、次に交代予定地点との近さで選ぶ。
 * 左側通行のため、進行方向右側（高速なら反対車線の上り/下り）の施設は不利にする。
 */
function pickOnRouteCandidate(
  candidates: DriverChangeStop[],
  path: RoutePath,
  legIndex: number,
  targetKm: number,
  maxOffRouteKm: number,
  rightSidePenalty: number
): { stop: DriverChangeStop; alongKm: number } | null {
  let best: { stop: DriverChangeStop; alongKm: number; score: number } | null = null

  for (const stop of candidates) {
    const { offRouteKm, alongKm, onRightSide } = locateOnLeg(path, legIndex, stop)
    if (offRouteKm > maxOffRouteKm) continue

    const score =
      offRouteKm * 2 +
      Math.abs(alongKm - targetKm) * 0.2 +
      (onRightSide ? rightSidePenalty : 0)
    if (!best || score < best.score) {
      best = { stop, alongKm, score }
    }
  }

  return best ? { stop: best.stop, alongKm: best.alongKm } : null
}

async function findDriverChangeStopOnLeg(
  path: RoutePath,
  plan: DriverChangeInsertion,
  useHighway: boolean,
  insertionIndex: number,
  maxOffRouteKm: number,
  rightSidePenalty: number
): Promise<{ stop: DriverChangeStop; alongKm: number } | null> {
  for (const offset of FRACTION_RETRY_OFFSETS) {
    const fraction = plan.fraction + offset
    if (fraction <= 0.05 || fraction >= 0.98) continue

    const { point, alongKm: targetKm } = pointAlongLeg(path, plan.legIndex, fraction)

    if (useHighway) {
      const preferParkingArea = insertionIndex % 2 === 1
      for (const parkingArea of [preferParkingArea, !preferParkingArea]) {
        const candidates = await searchHighwayRestCandidates(point, parkingArea)
        const picked = pickOnRouteCandidate(
          candidates,
          path,
          plan.legIndex,
          targetKm,
          maxOffRouteKm,
          rightSidePenalty
        )
        if (picked) return picked
      }
      continue
    }

    const candidates = await searchConvenienceStoreCandidates(point)
    const picked = pickOnRouteCandidate(
      candidates,
      path,
      plan.legIndex,
      targetKm,
      maxOffRouteKm,
      rightSidePenalty
    )
    if (picked) return picked
  }

  return null
}

/**
 * 運転上限を超える区間に運転交代地点を挿入する。
 * polyline（実際の走行ルート）があれば道路沿いの地点だけを選び、寄り道を防ぐ。
 */
export async function insertDriverChangeStops(
  stops: PoiPlace[],
  sections: RouteSection[],
  maxDriveMin: number,
  useHighway: boolean,
  origin: LatLng,
  roundTrip = false,
  polyline: LatLng[] = []
): Promise<PoiPlace[]> {
  if (maxDriveMin <= 0) return stops

  const waypoints = roundTrip
    ? [origin, ...stops, origin]
    : [origin, ...stops]
  const planned = planDriverChangeInsertions(
    origin,
    stops,
    sections,
    maxDriveMin,
    roundTrip
  )
  if (planned.length === 0) return stops

  // 縮退時の polyline は地点を結んだだけなので、道路からの距離では絞り込まない
  const hasRoadShape = polyline.length > waypoints.length
  const path = buildRoutePath(hasRoadShape ? polyline : waypoints, waypoints)
  if (!path) return stops

  const maxOffRouteKm = !hasRoadShape
    ? Infinity
    : useHighway
      ? MAX_OFF_ROUTE_KM_HIGHWAY
      : MAX_OFF_ROUTE_KM_LOCAL
  const rightSidePenalty = !hasRoadShape
    ? 0
    : useHighway
      ? RIGHT_SIDE_PENALTY_HIGHWAY
      : RIGHT_SIDE_PENALTY_LOCAL

  const accepted: PoiPlace[] = [...stops]
  const restStopsByLeg = new Map<number, Array<{ stop: PoiPlace; alongKm: number }>>()

  for (const [planIndex, plan] of planned.entries()) {
    let found: Awaited<ReturnType<typeof findDriverChangeStopOnLeg>>
    try {
      found = await findDriverChangeStopOnLeg(
        path,
        plan,
        useHighway,
        planIndex,
        maxOffRouteKm,
        rightSidePenalty
      )
    } catch (error) {
      // Places の上限超過などで検索できない場合は、交代地点なしでルートを返す
      console.warn('Driver change stop search failed:', error)
      break
    }
    if (!found) continue

    // 上り・下りの同名SAは別IDだが数百m以内に並ぶため、距離でも重複を判定する
    const duplicate = accepted.some(
      (stop) =>
        stop.id === found.stop.id ||
        haversineKm(stop.lat, stop.lng, found.stop.lat, found.stop.lng) <
          DUPLICATE_REST_STOP_RADIUS_KM
    )
    if (duplicate) continue

    accepted.push(found.stop)
    const legStops = restStopsByLeg.get(plan.legIndex) ?? []
    legStops.push(found)
    restStopsByLeg.set(plan.legIndex, legStops)
  }

  if (restStopsByLeg.size === 0) return stops

  // 区間ごとに道路上の位置順で並べ、行ったり来たりしない順序にする
  const result: PoiPlace[] = []
  for (let legIndex = 0; legIndex < waypoints.length - 1; legIndex += 1) {
    const legStops = (restStopsByLeg.get(legIndex) ?? []).sort(
      (a, b) => a.alongKm - b.alongKm
    )
    result.push(...legStops.map((item) => item.stop))
    if (legIndex < stops.length) result.push(stops[legIndex])
  }

  return result
}
