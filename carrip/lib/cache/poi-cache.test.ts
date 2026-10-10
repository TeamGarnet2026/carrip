import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PoiPlace } from '@/lib/google/types'
import type { TollPriceResult } from '@/lib/prices/toll'

const redisMock = {
  get: vi.fn(),
  set: vi.fn(),
}
let redisConfigured = false

vi.mock('@/lib/redis/client', () => ({
  isRedisConfigured: () => redisConfigured,
  getRedis: () => redisMock,
}))

const searchTouristSpots = vi.fn()
vi.mock('@/lib/google/places', () => ({
  searchTouristSpots: (...args: unknown[]) => searchTouristSpots(...args),
}))

const {
  getCachedPlacesByPrefecture,
  getCachedPoiSearch,
  getPoiCacheKey,
  setCachedPlacesByPrefecture,
  setCachedPoiSearch,
} = await import('@/lib/cache/poi-cache')
const { getCachedTollPrice, setCachedTollPrice } = await import('@/lib/prices/toll-cache')
const { suggestTouristSpots, toSpotCandidate } = await import('@/lib/poi/suggest')

function place(id: string, lat = 35, lng = 135.7): PoiPlace {
  return { id, name: id, address: '京都府', lat, lng, rating: 4.5, userRatingCount: 100 }
}

const toll = { toll_yen: 1200 } as unknown as TollPriceResult

beforeEach(() => {
  redisConfigured = false
  redisMock.get.mockReset()
  redisMock.set.mockReset()
  searchTouristSpots.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('poi cache', () => {
  it('builds keys independent of the order of prefectures / preferences', () => {
    expect(getPoiCacheKey(['大阪府', '京都府'], ['onsen', 'scenic'])).toBe(
      getPoiCacheKey(['京都府', '大阪府'], ['scenic', 'onsen'])
    )
    expect(getPoiCacheKey(['京都府'])).toBe('poi:search:京都府::')
  })

  it('stores places in memory until they expire', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T00:00:00Z'))
    await setCachedPlacesByPrefecture('京都府', [], [place('a')])
    await expect(getCachedPlacesByPrefecture('京都府')).resolves.toHaveLength(1)

    vi.setSystemTime(new Date('2026-10-18T00:00:00Z'))
    await expect(getCachedPlacesByPrefecture('京都府')).resolves.toBeNull()
    await expect(getCachedPoiSearch('poi:search:none')).resolves.toBeNull()
  })

  it('uses redis when configured and ignores redis errors', async () => {
    redisConfigured = true
    redisMock.get.mockResolvedValueOnce([place('r')])
    await expect(getCachedPoiSearch('k')).resolves.toEqual([place('r')])

    await setCachedPoiSearch('k', [place('r')])
    expect(redisMock.set).toHaveBeenCalledWith('k', [place('r')], {
      ex: 60 * 60 * 24 * 7,
    })

    redisMock.get.mockRejectedValueOnce(new Error('down'))
    redisMock.set.mockRejectedValueOnce(new Error('down'))
    await expect(getCachedPoiSearch('k')).resolves.toBeNull()
    await expect(setCachedPoiSearch('k', [])).resolves.toBeUndefined()
  })
})

describe('toll cache', () => {
  it('stores toll prices in memory for one day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T00:00:00Z'))
    await setCachedTollPrice('toll:a', toll)
    await expect(getCachedTollPrice('toll:a')).resolves.toEqual(toll)

    vi.setSystemTime(new Date('2026-10-11T00:00:01Z'))
    await expect(getCachedTollPrice('toll:a')).resolves.toBeNull()
    await expect(getCachedTollPrice('toll:missing')).resolves.toBeNull()
  })

  it('uses redis when configured and ignores redis errors', async () => {
    redisConfigured = true
    redisMock.get.mockResolvedValueOnce(toll)
    await expect(getCachedTollPrice('toll:r')).resolves.toEqual(toll)
    await setCachedTollPrice('toll:r', toll)
    expect(redisMock.set).toHaveBeenCalledWith('toll:r', toll, { ex: 86400 })

    redisMock.get.mockRejectedValueOnce(new Error('down'))
    redisMock.set.mockRejectedValueOnce(new Error('down'))
    await expect(getCachedTollPrice('toll:r')).resolves.toBeNull()
    await expect(setCachedTollPrice('toll:r', toll)).resolves.toBeUndefined()
  })
})

describe('suggestTouristSpots', () => {
  it('returns cached places without calling the Places API', async () => {
    await setCachedPlacesByPrefecture('奈良県', ['view'], [place('nara')])
    const result = await suggestTouristSpots(['奈良県'], ['view'])
    expect(result).toEqual({ places: [place('nara')], usedFallback: false })
    expect(searchTouristSpots).not.toHaveBeenCalled()
  })

  it('fetches, caches and merges places across prefectures without duplicates', async () => {
    searchTouristSpots
      .mockResolvedValueOnce([place('shared', 34.6, 135.5), place('osaka', 34.7, 135.4)])
      .mockResolvedValueOnce([place('shared', 34.6, 135.5), place('hyogo', 34.69, 135.19)])

    const result = await suggestTouristSpots(['大阪府', '兵庫県'], ['gourmet'])
    expect(result.usedFallback).toBe(false)
    expect(result.places.map((p) => p.id).sort()).toEqual(['hyogo', 'osaka', 'shared'])
    await expect(getCachedPlacesByPrefecture('大阪府', ['gourmet'])).resolves.toHaveLength(2)
  })

  it('returns no places (without caching) when the API finds nothing', async () => {
    searchTouristSpots.mockResolvedValueOnce([])
    const result = await suggestTouristSpots(['鳥取県'])
    expect(result).toEqual({ places: [], usedFallback: false })
    await expect(getCachedPlacesByPrefecture('鳥取県')).resolves.toBeNull()
  })

  it('reports a fallback when the Places API fails', async () => {
    searchTouristSpots.mockRejectedValueOnce(new Error('quota'))
    const result = await suggestTouristSpots(['島根県'])
    expect(result).toEqual({ places: [], usedFallback: true })
  })
})

describe('toSpotCandidate', () => {
  it('maps a place and falls back to the given category', () => {
    expect(toSpotCandidate(place('a'))).toEqual({
      place_id: 'a',
      name: 'a',
      address: '京都府',
      lat: 35,
      lng: 135.7,
      rating: 4.5,
      user_rating_count: 100,
      category: 'tourist',
    })
    expect(toSpotCandidate({ ...place('b'), category: 'onsen' }, 'x').category).toBe(
      'onsen'
    )
  })
})
