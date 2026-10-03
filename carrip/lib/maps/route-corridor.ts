export type LatLng = { lat: number; lng: number }

/** 目的地周辺からの最大許容距離（km） */
export const DESTINATION_RADIUS_KM = 35

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
