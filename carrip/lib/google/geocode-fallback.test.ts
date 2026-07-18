import { describe, expect, it } from 'vitest'
import { lookupLocalGeocode } from '@/lib/google/geocode-fallback'

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
})
