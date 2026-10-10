import { describe, expect, it } from 'vitest'
import {
  defaultSpotSelectMode,
  pickRecommendedSpots,
  recommendedSpotCount,
  shouldAutoPick,
} from '@/lib/poi/recommend'

const place = (id: string) => ({ place_id: id, name: id })

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

describe('pickRecommendedSpots', () => {
  it('takes the top places in order without duplicates', () => {
    const places = [place('a'), place('b'), place('a'), place('c'), place('d')]
    expect(pickRecommendedSpots(places, 3).map((p) => p.place_id)).toEqual(['a', 'b', 'c'])
  })

  it('returns fewer when there are not enough candidates', () => {
    expect(pickRecommendedSpots([place('a')], 3)).toEqual([place('a')])
    expect(pickRecommendedSpots([], 3)).toEqual([])
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
