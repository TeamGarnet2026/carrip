import { describe, expect, it } from 'vitest'
import { orderStopsFromOrigin } from '@/lib/maps/route-corridor'
import { optimizeStopOrder, tourLengthKm } from '@/lib/routes/order-stops'

const origin = { lat: 35.0, lng: 135.0 }

function stop(id: string, lat: number, lng: number) {
  return { id, lat, lng }
}

describe('optimizeStopOrder', () => {
  it('returns copies for zero or one stop', () => {
    expect(optimizeStopOrder(origin, [], false)).toEqual([])
    const single = [stop('a', 35.1, 135.1)]
    expect(optimizeStopOrder(origin, single, true)).toEqual(single)
  })

  it('visits stops along a line in order of distance for one-way trips', () => {
    const stops = [
      stop('far', 35.3, 135.0),
      stop('near', 35.1, 135.0),
      stop('mid', 35.2, 135.0),
    ]
    const ordered = optimizeStopOrder(origin, stops, false)
    expect(ordered.map((s) => s.id)).toEqual(['near', 'mid', 'far'])
  })

  it('never produces a longer tour than the given order', () => {
    const stops = [
      stop('a', 35.2, 135.2),
      stop('b', 35.0, 135.3),
      stop('c', 35.2, 135.0),
      stop('d', 35.0, 135.1),
      stop('e', 35.3, 135.3),
    ]
    for (const roundTrip of [true, false]) {
      const ordered = optimizeStopOrder(origin, stops, roundTrip)
      expect(ordered).toHaveLength(stops.length)
      expect(new Set(ordered.map((s) => s.id))).toEqual(
        new Set(stops.map((s) => s.id))
      )
      expect(tourLengthKm(origin, ordered, roundTrip)).toBeLessThanOrEqual(
        tourLengthKm(origin, stops, roundTrip) + 1e-9
      )
    }
  })

  it('untangles a crossing loop for round trips', () => {
    // 正方形の4隅を交差する順に渡す
    const stops = [
      stop('ne', 35.1, 135.1),
      stop('sw', 34.9, 134.9),
      stop('nw', 35.1, 134.9),
      stop('se', 34.9, 135.1),
    ]
    const center = { lat: 35.0, lng: 135.0 }
    const ordered = optimizeStopOrder(center, stops, true)
    const ids = ordered.map((s) => s.id)
    const neIndex = ids.indexOf('ne')
    const swIndex = ids.indexOf('sw')
    // 対角の点が隣り合わない（＝外周を回る）
    expect(Math.abs(neIndex - swIndex)).toBe(2)
  })
})

/** 再現性のある乱数（テストごとに同じ配置を作る） */
function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomStops(seed: number, count: number) {
  const random = seededRandom(seed)
  return Array.from({ length: count }, (_, index) =>
    stop(`p${index}`, 34.8 + random() * 0.6, 135.4 + random() * 0.6)
  )
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items]
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
      (rest) => [item, ...rest]
    )
  )
}

describe('orderStopsFromOrigin（貪欲法・最近傍法）', () => {
  it('picks the nearest remaining stop from the current point, not from the origin', () => {
    // 出発地からの距離順だと a(11km) → c(23km) → b(33km) だが、
    // a から見ると b(22km) の方が c(25km) より近いので a → b → c になる
    const stops = [
      stop('c', 35.0, 135.25),
      stop('b', 35.3, 135.0),
      stop('a', 35.1, 135.0),
    ]
    expect(orderStopsFromOrigin(origin, stops).map((s) => s.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('returns an empty list for no stops and does not mutate the input', () => {
    expect(orderStopsFromOrigin(origin, [])).toEqual([])
    const stops = [stop('far', 35.5, 135.5), stop('near', 35.1, 135.1)]
    const snapshot = stops.map((s) => s.id)
    orderStopsFromOrigin(origin, stops)
    expect(stops.map((s) => s.id)).toEqual(snapshot)
  })
})

describe('optimizeStopOrder（2-opt 改善）', () => {
  it('never returns a longer tour than the greedy initial solution', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const stops = randomStops(seed, 8)
      for (const roundTrip of [true, false]) {
        const greedy = orderStopsFromOrigin(origin, stops)
        const improved = optimizeStopOrder(origin, stops, roundTrip)
        expect(tourLengthKm(origin, improved, roundTrip)).toBeLessThanOrEqual(
          tourLengthKm(origin, greedy, roundTrip) + 1e-9
        )
      }
    }
  })

  it('returns a 2-opt local optimum (no single segment reversal shortens it)', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const stops = randomStops(seed, 8)
      for (const roundTrip of [true, false]) {
        const result = optimizeStopOrder(origin, stops, roundTrip)
        const length = tourLengthKm(origin, result, roundTrip)
        for (let i = 0; i < result.length - 1; i += 1) {
          for (let j = i + 1; j < result.length; j += 1) {
            const reversed = [
              ...result.slice(0, i),
              ...result.slice(i, j + 1).reverse(),
              ...result.slice(j + 1),
            ]
            expect(tourLengthKm(origin, reversed, roundTrip)).toBeGreaterThanOrEqual(
              length - 1e-9
            )
          }
        }
      }
    }
  })

  it('stays close to the exact optimum for small instances', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const stops = randomStops(seed, 6)
      for (const roundTrip of [true, false]) {
        const optimum = Math.min(
          ...permutations(stops).map((order) =>
            tourLengthKm(origin, order, roundTrip)
          )
        )
        const result = tourLengthKm(
          origin,
          optimizeStopOrder(origin, stops, roundTrip),
          roundTrip
        )
        // 2-opt は厳密解を保証しないが、6地点程度なら最適解の 10% 以内に収まる
        expect(result).toBeLessThanOrEqual(optimum * 1.1 + 1e-9)
      }
    }
  })

  it('handles a single stop and two stops', () => {
    const one = [stop('only', 35.1, 135.1)]
    expect(optimizeStopOrder(origin, one, true)).toEqual(one)
    const two = [stop('far', 35.4, 135.4), stop('near', 35.1, 135.1)]
    expect(optimizeStopOrder(origin, two, false).map((s) => s.id)).toEqual([
      'near',
      'far',
    ])
  })
})
