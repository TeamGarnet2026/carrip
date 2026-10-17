import { describe, expect, it } from 'vitest'
import {
  addMinutesToClock,
  formatDuration,
  formatJapaneseDate,
  formatShortDate,
  formatTripLength,
  formatYen,
} from '@/lib/format'

describe('date formatting', () => {
  it('formats ISO dates with the weekday', () => {
    expect(formatJapaneseDate('2026-11-03')).toBe('11月3日（火）')
    expect(formatShortDate('2026-11-03')).toBe('11/3（火）')
  })

  it('returns the input for invalid dates', () => {
    expect(formatJapaneseDate('not-a-date')).toBe('not-a-date')
    expect(formatShortDate('')).toBe('')
  })
})

describe('formatTripLength', () => {
  it('describes day trips and overnight trips', () => {
    expect(formatTripLength(1)).toBe('日帰り')
    expect(formatTripLength(0)).toBe('日帰り')
    expect(formatTripLength(2)).toBe('1泊2日')
    expect(formatTripLength(3)).toBe('2泊3日')
  })
})

describe('formatYen / formatDuration', () => {
  it('formats yen with separators', () => {
    expect(formatYen(2850)).toBe('¥2,850')
    expect(formatYen(11400.4)).toBe('¥11,400')
  })

  it('formats minutes as hours and minutes', () => {
    expect(formatDuration(45)).toBe('45分')
    expect(formatDuration(120)).toBe('2時間')
    expect(formatDuration(190)).toBe('3時間10分')
    expect(formatDuration(-5)).toBe('0分')
  })
})

describe('addMinutesToClock', () => {
  it('adds minutes and wraps around midnight', () => {
    expect(addMinutesToClock('9:00', 25)).toBe('9:25')
    expect(addMinutesToClock('08:00', 220)).toBe('11:40')
    expect(addMinutesToClock('23:30', 45)).toBe('0:15')
    expect(addMinutesToClock('bad', 10)).toBe('bad')
  })
})
