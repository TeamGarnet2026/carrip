import { describe, expect, it } from 'vitest'
import {
  defaultSpotSelectMode,
  isLikelyCarRoutableSpot,
  pickRecommendedSpots,
  recommendedSpotCount,
  shouldAutoPick,
} from '@/lib/poi/recommend'

const place = (
  id: string,
  overrides: Partial<{
    name: string
    lat: number
    lng: number
    rating: number
  }> = {}
) => ({
  place_id: id,
  name: overrides.name ?? id,
  lat: overrides.lat ?? 35,
  lng: overrides.lng ?? 135,
  rating: overrides.rating,
})

describe('recommendedSpotCount', () => {
  it('picks three spots per day up to the selectable maximum', () => {
    expect(recommendedSpotCount(1)).toBe(3)
    expect(recommendedSpotCount(2)).toBe(6)
    expect(recommendedSpotCount(7)).toBe(10)
  })

  it('treats invalid day counts as a day trip', () => {
    expect(recommendedSpotCount(0)).toBe(3)
    expect(recommendedSpotCount(Number.NaN)).toBe(3)
  })
})

describe('isLikelyCarRoutableSpot', () => {
  it('keeps mainland names including 広島', () => {
    expect(isLikelyCarRoutableSpot('岡山後楽園')).toBe(true)
    expect(isLikelyCarRoutableSpot('広島城')).toBe(true)
  })

  it('flags island-style spot names', () => {
    expect(isLikelyCarRoutableSpot('黒島 ヴィーナスロード')).toBe(false)
    expect(isLikelyCarRoutableSpot('宮島')).toBe(false)
  })
})

describe('pickRecommendedSpots', () => {
  it('takes the top places in order without duplicates when no origin is given', () => {
    const places = [
      place('a', { rating: 5 }),
      place('b', { rating: 4 }),
      place('a', { rating: 5 }),
      place('c', { rating: 3 }),
      place('d', { rating: 2 }),
    ]
    expect(pickRecommendedSpots(places, 3).map((p) => p.place_id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('returns fewer when there are not enough candidates', () => {
    expect(pickRecommendedSpots([place('a')], 3)).toEqual([place('a')])
    expect(pickRecommendedSpots([], 3)).toEqual([])
  })

  it('skips island-like names so car routing stays feasible', () => {
    const places = [
      place('island', {
        name: '黒島 ヴィーナスロード',
        lat: 34.6,
        lng: 134.16,
        rating: 5,
      }),
      place('korakuen', {
        name: '岡山後楽園',
        lat: 34.67,
        lng: 133.94,
        rating: 4.4,
      }),
      place('kurashiki', {
        name: '倉敷美観地区',
        lat: 34.6,
        lng: 133.77,
        rating: 4.4,
      }),
      place('castle', {
        name: '備中松山城',
        lat: 34.81,
        lng: 133.62,
        rating: 4.4,
      }),
    ]
    const picked = pickRecommendedSpots(places, 3, {
      origin: { lat: 35.0, lng: 135.75 },
      roundTrip: true,
    })
    expect(picked.map((p) => p.place_id)).not.toContain('island')
    expect(picked).toHaveLength(3)
  })

  it('orders picks from the origin for a shorter tour', () => {
    const origin = { lat: 35.0, lng: 135.75 }
    const places = [
      place('far', { name: '遠い高評価', lat: 34.5, lng: 133.5, rating: 5 }),
      place('near', { name: '近い', lat: 34.95, lng: 135.6, rating: 4 }),
      place('mid', { name: '中間', lat: 34.8, lng: 134.5, rating: 4.2 }),
    ]
    const picked = pickRecommendedSpots(places, 3, { origin, roundTrip: false })
    expect(picked[0].place_id).toBe('near')
  })
})

describe('defaultSpotSelectMode', () => {
  it('keeps a saved mode', () => {
    expect(defaultSpotSelectMode('manual', 0)).toBe('manual')
    expect(defaultSpotSelectMode('auto', 5)).toBe('auto')
  })

  it('starts in auto mode only when nothing is selected yet', () => {
    expect(defaultSpotSelectMode(undefined, 0)).toBe('auto')
    expect(defaultSpotSelectMode(undefined, 2)).toBe('manual')
  })
})

describe('shouldAutoPick', () => {
  it('fills an empty selection in auto mode', () => {
    expect(shouldAutoPick({ mode: 'auto', selectedCount: 0, autoPicked: false })).toBe(true)
  })

  it('refreshes picks that were chosen automatically and not edited', () => {
    expect(shouldAutoPick({ mode: 'auto', selectedCount: 3, autoPicked: true })).toBe(true)
  })

  it('never overwrites edited selections or manual mode', () => {
    expect(shouldAutoPick({ mode: 'auto', selectedCount: 3, autoPicked: false })).toBe(false)
    expect(shouldAutoPick({ mode: 'manual', selectedCount: 0, autoPicked: true })).toBe(false)
  })
})
