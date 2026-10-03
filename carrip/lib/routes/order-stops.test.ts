import { describe, expect, it } from 'vitest'
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
