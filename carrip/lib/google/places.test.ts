import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPlaceAdmissionFee,
  geocodeAddress,
  resolveAdmissionFeesForStops,
  searchTouristSpots,
} from '@/lib/google/places'
import {
  searchPlacesByText,
  searchRestAreas,
  searchTouristPois,
} from '@/lib/poi/search'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) }
}

function rawPlace(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    displayName: { text: id },
    formattedAddress: `${id}の住所`,
    location: { latitude: 35, longitude: 135.7 },
    rating: 4.5,
    userRatingCount: 300,
    ...extra,
  }
}

function sentBody(call = 0) {
  return JSON.parse(fetchMock.mock.calls[call][1].body as string)
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('GOOGLE_CLOUD_API_KEY', 'test-key')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('searchTouristSpots', () => {
  it('adds preference keywords to the query and filters low-quality places', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        places: [
          rawPlace('good-low', { rating: 4.0 }),
          rawPlace('good-high', { rating: 4.8 }),
          rawPlace('low-rating', { rating: 3.5 }),
          rawPlace('few-reviews', { userRatingCount: 5 }),
          { id: 'broken', displayName: { text: 'no location' } },
          rawPlace('no-address', { formattedAddress: undefined }),
        ],
      })
    )

    const places = await searchTouristSpots('京都府', ['onsen', 'unknown'])
    expect(sentBody().textQuery).toBe('京都府 観光スポット 温泉')
    expect(places.map((place) => place.id)).toEqual(['good-high', 'no-address', 'good-low'])
    expect(places.find((place) => place.id === 'no-address')?.address).toBe('no-address')
  })

  it('throws with the status code when the API fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse('quota exceeded', false, 429))
    await expect(searchTouristSpots('京都府')).rejects.toThrow('Places API エラー (429)')
  })

  it('handles an empty response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}))
    await expect(searchTouristSpots('京都府')).resolves.toEqual([])
  })
})

describe('geocodeAddress', () => {
  it('resolves known places locally without calling the API', async () => {
    await expect(geocodeAddress('京都駅')).resolves.toEqual({
      lat: 34.985849,
      lng: 135.758767,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the Places API for other addresses', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ places: [{ location: { latitude: 35.5, longitude: 134.2 } }] })
    )
    await expect(geocodeAddress('鳥取砂丘')).resolves.toEqual({ lat: 35.5, lng: 134.2 })
    expect(sentBody().textQuery).toBe('鳥取砂丘')
  })

  it('returns null when the API fails or finds nothing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500))
    await expect(geocodeAddress('どこか')).resolves.toBeNull()
    fetchMock.mockResolvedValueOnce(jsonResponse({ places: [] }))
    await expect(geocodeAddress('どこか')).resolves.toBeNull()
  })
})

describe('admission fees', () => {
  const yen = (units: string) => ({ startPrice: { currencyCode: 'JPY', units } })

  it('reads the start price of the place details', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ priceRange: yen('500') }))
    await expect(fetchPlaceAdmissionFee('abc')).resolves.toBe(500)
    expect(fetchMock.mock.calls[0][0]).toBe('https://places.googleapis.com/v1/places/abc')

    fetchMock.mockResolvedValueOnce(jsonResponse({ priceLevel: 'PRICE_LEVEL_FREE' }))
    await expect(fetchPlaceAdmissionFee('places/def')).resolves.toBe(0)
    expect(fetchMock.mock.calls[1][0]).toBe('https://places.googleapis.com/v1/places/def')
  })

  it('treats failed detail requests as free', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 404))
    await expect(fetchPlaceAdmissionFee('abc')).resolves.toBe(0)
  })

  it('fetches details only for stops without a known price', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ priceRange: yen('1200') }))
    const fees = await resolveAdmissionFeesForStops([
      { id: 'known', name: 'A', address: '', lat: 0, lng: 0, priceRange: yen('400') },
      { id: 'unknown', name: 'B', address: '', lat: 0, lng: 0 },
    ])
    expect(fees).toEqual([400, 1200])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('poi search', () => {
  it('searches by text with a location bias and default limit', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ places: [rawPlace('a')] }))
    await searchPlacesByText('清水寺', { locationBias: { lat: 35, lng: 135.7 } })
    expect(sentBody()).toMatchObject({
      textQuery: '清水寺',
      maxResultCount: 10,
      locationBias: { circle: { radius: 50000 } },
    })
  })

  it('can skip the quality filter', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ places: [rawPlace('low', { rating: 2.0 })] })
    )
    const places = await searchPlacesByText('x', { skipQualityFilter: true })
    expect(places).toHaveLength(1)
  })

  it('throws on API errors and handles empty responses', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse('bad', false, 400))
    await expect(searchPlacesByText('x')).rejects.toThrow('Places API エラー (400)')
    fetchMock.mockResolvedValueOnce(jsonResponse({}))
    await expect(searchPlacesByText('x')).resolves.toEqual([])
  })

  it('builds tourist queries with and without a prefecture', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ places: [] }))
    await searchTouristPois('寺', '京都府')
    await searchTouristPois('寺')
    expect(sentBody(0)).toMatchObject({ textQuery: '京都府 寺 観光', maxResultCount: 20 })
    expect(sentBody(1).textQuery).toBe('寺 観光')
  })

  it('merges rest-area searches, removes duplicates and infers categories', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ places: [rawPlace('道の駅 かつらぎ'), rawPlace('shared SA')] })
      )
      .mockResolvedValueOnce(
        jsonResponse({ places: [rawPlace('桂川サービスエリア'), rawPlace('shared SA')] })
      )

    const places = await searchRestAreas('京都')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(places.map((place) => [place.id, place.category])).toEqual([
      ['道の駅 かつらぎ', 'rest_area'],
      ['shared SA', 'service_area'],
      ['桂川サービスエリア', 'service_area'],
    ])
  })

  it('uses the requested category for keyword-specific searches', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ places: [rawPlace('どこか')] }))
    const serviceAreas = await searchRestAreas('京都', 'service_area')
    expect(serviceAreas[0].category).toBe('service_area')
    expect(sentBody(0).textQuery).toBe('京都 サービスエリア')

    fetchMock.mockClear()
    const restAreas = await searchRestAreas('', 'rest_area')
    expect(restAreas[0].category).toBe('rest_area')
    expect(sentBody(0).textQuery).toBe('道の駅')
  })
})
