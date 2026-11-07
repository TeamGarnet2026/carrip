import { describe, expect, it } from 'vitest'
import { parseOriginPlaceParams, setOriginPlaceParams } from '@/lib/plan/origin-params'

describe('origin place URL params', () => {
  it('round-trips a selected origin', () => {
    const params = new URLSearchParams()
    setOriginPlaceParams(params, { lat: 34.985849, lng: 135.758767, prefecture: '京都府' })
    expect(
      parseOriginPlaceParams({
        origin_lat: params.get('origin_lat') ?? undefined,
        origin_lng: params.get('origin_lng') ?? undefined,
        origin_pref: params.get('origin_pref') ?? undefined,
      })
    ).toEqual({ lat: 34.985849, lng: 135.758767, prefecture: '京都府' })
  })

  it('ignores missing or out-of-range coordinates', () => {
    expect(parseOriginPlaceParams({})).toBeUndefined()
    expect(parseOriginPlaceParams({ origin_lat: '35' })).toBeUndefined()
    expect(parseOriginPlaceParams({ origin_lat: '95', origin_lng: '135' })).toBeUndefined()
    expect(parseOriginPlaceParams({ origin_lat: 'x', origin_lng: '135' })).toBeUndefined()
  })

  it('drops an unknown prefecture name', () => {
    expect(
      parseOriginPlaceParams({ origin_lat: '35', origin_lng: '135', origin_pref: 'どこか県' })
    ).toEqual({ lat: 35, lng: 135 })
  })
})
