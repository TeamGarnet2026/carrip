import { describe, expect, it } from 'vitest'
import {
  formatGpsOrigin,
  lookupLocalGeocode,
  parseCoordinates,
} from '@/lib/google/geocode-fallback'

describe('lookupLocalGeocode', () => {
  it('resolves 京都駅 without Places API', () => {
    const point = lookupLocalGeocode('京都駅')
    expect(point).toEqual({ lat: 34.985849, lng: 135.758767 })
  })

  it('resolves prefecture names from PREFECTURE_META', () => {
    const point = lookupLocalGeocode('愛知県')
    expect(point?.lat).toBeCloseTo(35.1802, 3)
    expect(point?.lng).toBeCloseTo(136.9066, 3)
  })

  it('trims whitespace', () => {
    expect(lookupLocalGeocode(' 京都駅 ')).not.toBeNull()
  })

  it('returns null for unknown queries', () => {
    expect(lookupLocalGeocode('どこでもない場所xyz')).toBeNull()
  })

  it('does not resolve an address to the numbers inside it', () => {
    // 都道府県名で解決され、「30、1」を座標として扱わない
    expect(lookupLocalGeocode('奈良県奈良市登大路町30、1')).not.toEqual({ lat: 30, lng: 1 })
  })

  it('uses coordinates from a GPS origin as-is', () => {
    expect(lookupLocalGeocode(formatGpsOrigin(35.0116, 135.7681))).toEqual({
      lat: 35.0116,
      lng: 135.7681,
    })
  })
})

describe('parseCoordinates', () => {
  it('parses "lat, lng" with various separators', () => {
    expect(parseCoordinates('35.01, 135.76')).toEqual({ lat: 35.01, lng: 135.76 })
    expect(parseCoordinates('現在地（34.98585、135.75877）')).toEqual({
      lat: 34.98585,
      lng: 135.75877,
    })
  })

  it('ignores out-of-range values and plain text', () => {
    expect(parseCoordinates('95.0, 135.0')).toBeNull()
    expect(parseCoordinates('京都駅')).toBeNull()
  })

  it('does not treat numbers inside an address as coordinates', () => {
    expect(parseCoordinates('奈良市登大路町30、1')).toBeNull()
    expect(parseCoordinates('京都市中京区三条通 1, 2')).toBeNull()
    expect(parseCoordinates('現在地（34.98585, 135.75877）付近の駐車場')).toBeNull()
  })
})

describe('formatGpsOrigin', () => {
  it('rounds to 5 decimal places', () => {
    expect(formatGpsOrigin(35.0116123, 135.7681456)).toBe(
      '現在地（35.01161, 135.76815）'
    )
  })
})
