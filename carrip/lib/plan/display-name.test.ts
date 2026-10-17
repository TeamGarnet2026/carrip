import { describe, expect, it } from 'vitest'
import { planDisplayName, shortPrefectureName } from '@/lib/plan/display-name'

describe('shortPrefectureName', () => {
  it('drops the 都・府・県 suffix but keeps 北海道', () => {
    expect(shortPrefectureName('京都府')).toBe('京都')
    expect(shortPrefectureName('東京都')).toBe('東京')
    expect(shortPrefectureName('長野県')).toBe('長野')
    expect(shortPrefectureName('北海道')).toBe('北海道')
  })
})

describe('planDisplayName', () => {
  it('combines up to three areas with the trip length', () => {
    expect(planDisplayName(['京都府'], 1)).toBe('京都 日帰りドライブ')
    expect(planDisplayName(['京都府', '奈良県'], 2)).toBe('京都・奈良 1泊2日ドライブ')
    expect(planDisplayName(['大阪府', '兵庫県', '奈良県', '滋賀県'], 1)).toBe(
      '大阪・兵庫・奈良 日帰りドライブ'
    )
  })

  it('falls back when there is no area', () => {
    expect(planDisplayName([], 1)).toBe('ドライブ 日帰りドライブ')
  })
})
