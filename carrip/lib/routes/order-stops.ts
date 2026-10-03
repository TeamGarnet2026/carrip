import {
  haversineKm,
  orderStopsFromOrigin,
  type LatLng,
} from '@/lib/maps/route-corridor'

function distanceKm(a: LatLng, b: LatLng): number {
  return haversineKm(a.lat, a.lng, b.lat, b.lng)
}

export function tourLengthKm(
  origin: LatLng,
  stops: LatLng[],
  roundTrip: boolean
): number {
  let total = 0
  let current = origin
  for (const stop of stops) {
    total += distanceKm(current, stop)
    current = stop
  }
  if (roundTrip && stops.length > 0) {
    total += distanceKm(current, origin)
  }
  return total
}

/**
 * 外部 API を使わず直線距離で回る順番を決める。
 * 最近傍法で初期解を作り、2-opt で交差をほどく（立ち寄りは最大15件なので総当たりでも軽い）。
 */
export function optimizeStopOrder<T extends LatLng>(
  origin: LatLng,
  stops: T[],
  roundTrip: boolean
): T[] {
  if (stops.length <= 1) return [...stops]

  let best = orderStopsFromOrigin(origin, stops)
  let bestLength = tourLengthKm(origin, best, roundTrip)
  let improved = true

  while (improved) {
    improved = false
    for (let i = 0; i < best.length - 1; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ]
        const length = tourLengthKm(origin, candidate, roundTrip)
        if (length + 1e-9 < bestLength) {
          best = candidate
          bestLength = length
          improved = true
        }
      }
    }
  }

  return best
}
