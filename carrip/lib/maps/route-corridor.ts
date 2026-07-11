export type LatLng = { lat: number; lng: number }

/** 目的地周辺からの最大許容距離（km） */
export const DESTINATION_RADIUS_KM = 35

/** 出発地〜目的地コリドーからの最大許容距離（km） — 休憩地点用 */
export const CORRIDOR_MAX_DISTANCE_KM = 40

/** 生成後ルート（polyline）からの最大許容距離（km） */
export const POLYLINE_MAX_DISTANCE_KM = 25

/** 近接 POI の間引き距離（仕様: 500m） */
export const MIN_POI_SPACING_KM = 0.5

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const r = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 点から線分までの最短距離（km） */
export function distancePointToSegmentKm(
  point: LatLng,
  start: LatLng,
  end: LatLng
): number {
  const dx = end.lng - start.lng
  const dy = end.lat - start.lat

  if (dx === 0 && dy === 0) {
    return haversineKm(point.lat, point.lng, start.lat, start.lng)
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) /
        (dx * dx + dy * dy)
    )
  )

  const projection = {
    lat: start.lat + t * dy,
    lng: start.lng + t * dx,
  }

  return haversineKm(point.lat, point.lng, projection.lat, projection.lng)
}

export function minDistanceToCorridorKm(
  point: LatLng,
  corridor: LatLng[]
): number {
  if (corridor.length === 0) return Infinity
  if (corridor.length === 1) {
    return haversineKm(point.lat, point.lng, corridor[0].lat, corridor[0].lng)
  }

  let min = Infinity
  for (let i = 0; i < corridor.length - 1; i += 1) {
    min = Math.min(
      min,
      distancePointToSegmentKm(point, corridor[i], corridor[i + 1])
    )
  }
  return min
}

export function filterPlacesNearCorridor<T extends LatLng>(
  places: T[],
  corridor: LatLng[],
  maxDistanceKm: number
): T[] {
  if (corridor.length < 2) return places

  return places.filter(
    (place) => minDistanceToCorridorKm(place, corridor) <= maxDistanceKm
  )
}

export function filterStopsNearPolyline<T extends LatLng>(
  stops: T[],
  polyline: LatLng[],
  maxDistanceKm: number
): T[] {
  if (polyline.length < 2) return stops

  return stops.filter(
    (stop) => minDistanceToCorridorKm(stop, polyline) <= maxDistanceKm
  )
}

type RatedPlace = LatLng & { rating?: number | null }

/** 500m 以内の近接 POI を間引く（評価の高い順を優先） */
export function thinNearbyPlaces<T extends RatedPlace>(
  places: T[],
  minDistanceKm: number
): T[] {
  const sorted = [...places].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  const kept: T[] = []

  for (const place of sorted) {
    const tooClose = kept.some(
      (existing) =>
        haversineKm(place.lat, place.lng, existing.lat, existing.lng) <
        minDistanceKm
    )
    if (!tooClose) kept.push(place)
  }

  return kept
}

/** 複数目的地の重心 */
export function destinationCentroid(destinations: LatLng[]): LatLng {
  if (destinations.length === 0) {
    throw new Error('destinations must not be empty')
  }
  if (destinations.length === 1) return destinations[0]

  const count = destinations.length
  return {
    lat: destinations.reduce((sum, point) => sum + point.lat, 0) / count,
    lng: destinations.reduce((sum, point) => sum + point.lng, 0) / count,
  }
}

/** 出発地→目的地方向への進行度（大きいほど目的地側） */
export function progressTowardDestination(
  point: LatLng,
  origin: LatLng,
  destination: LatLng
): number {
  const dLat = destination.lat - origin.lat
  const dLng = destination.lng - origin.lng
  const length = Math.hypot(dLat, dLng)
  if (length === 0) return 0

  const pLat = point.lat - origin.lat
  const pLng = point.lng - origin.lng
  return (pLat * dLat + pLng * dLng) / length
}

/** 出発地から近い順に貪欲法で並べ替え */
export function orderStopsFromOrigin<T extends LatLng>(
  origin: LatLng,
  stops: T[]
): T[] {
  const remaining = [...stops]
  const ordered: T[] = []
  let current = origin

  while (remaining.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    for (let i = 0; i < remaining.length; i += 1) {
      const distance = haversineKm(
        current.lat,
        current.lng,
        remaining[i].lat,
        remaining[i].lng
      )
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    const [next] = remaining.splice(nearestIndex, 1)
    ordered.push(next)
    current = next
  }

  return ordered
}

/**
 * 出発地から目的地方向へ近づく順に並べ替え。
 * 目的地到着後に出発地方向へ戻る順序を避ける。
 */
export function orderStopsTowardDestination<T extends LatLng>(
  origin: LatLng,
  destination: LatLng,
  stops: T[]
): T[] {
  if (stops.length <= 1) return [...stops]

  return [...stops].sort((a, b) => {
    const progressDiff =
      progressTowardDestination(a, origin, destination) -
      progressTowardDestination(b, origin, destination)

    if (Math.abs(progressDiff) > 1e-6) return progressDiff

    const distA = haversineKm(a.lat, a.lng, destination.lat, destination.lng)
    const distB = haversineKm(b.lat, b.lng, destination.lat, destination.lng)
    return distA - distB
  })
}

export function orderStopsTowardDestinations<T extends LatLng>(
  origin: LatLng,
  destinations: LatLng[],
  stops: T[]
): T[] {
  if (destinations.length === 0) {
    return orderStopsFromOrigin(origin, stops)
  }

  return orderStopsTowardDestination(
    origin,
    destinationCentroid(destinations),
    stops
  )
}

export function filterPlacesNearPoint<T extends LatLng>(
  places: T[],
  center: LatLng,
  maxDistanceKm: number
): T[] {
  return places.filter(
    (place) =>
      haversineKm(place.lat, place.lng, center.lat, center.lng) <= maxDistanceKm
  )
}

export function filterPlacesNearDestinations<T extends LatLng>(
  places: T[],
  destinations: LatLng[],
  maxDistanceKm: number
): T[] {
  if (destinations.length === 0) return places

  return places.filter((place) =>
    destinations.some(
      (destination) =>
        haversineKm(place.lat, place.lng, destination.lat, destination.lng) <=
        maxDistanceKm
    )
  )
}

export function selectPlacesNearDestination<T extends RatedPlace>(
  places: T[],
  destinations: LatLng[],
  maxDistanceKm: number = DESTINATION_RADIUS_KM
): T[] {
  const near = filterPlacesNearDestinations(places, destinations, maxDistanceKm)
  const candidates =
    near.length >= 3
      ? near
      : filterPlacesNearDestinations(places, destinations, maxDistanceKm * 1.5)

  return thinNearbyPlaces(candidates, MIN_POI_SPACING_KM)
}

export function selectPlacesNearCorridor<T extends RatedPlace>(
  places: T[],
  corridor: LatLng[],
  maxDistanceKm: number = CORRIDOR_MAX_DISTANCE_KM
): T[] {
  const nearCorridor = filterPlacesNearCorridor(places, corridor, maxDistanceKm)
  const candidates =
    nearCorridor.length >= 3
      ? nearCorridor
      : filterPlacesNearCorridor(places, corridor, maxDistanceKm * 1.5)

  return thinNearbyPlaces(candidates, MIN_POI_SPACING_KM)
}
