import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchParkingOptionsFromPlace,
  resolveParkingFeeForStop,
  resolveParkingFeesForStops,
} from '@/lib/navitime/parking'

const fetchMock = vi.fn()

function response(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

const stop = { id: 'abc', name: '清水寺', lat: 34.99, lng: 135.78 }

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

describe('fetchParkingOptionsFromPlace', () => {
  it('requests only the parking options of the place', async () => {
    fetchMock.mockResolvedValueOnce(response({ parkingOptions: { paidParkingLot: true } }))
    await expect(fetchParkingOptionsFromPlace('abc')).resolves.toEqual({
      paidParkingLot: true,
    })
    expect(fetchMock.mock.calls[0][0]).toBe('https://places.googleapis.com/v1/places/abc')
    expect(fetchMock.mock.calls[0][1].headers['X-Goog-FieldMask']).toBe('parkingOptions')
  })

  it('returns null when the request fails or has no options', async () => {
    fetchMock.mockResolvedValueOnce(response({}, false))
    await expect(fetchParkingOptionsFromPlace('places/abc')).resolves.toBeNull()
    expect(fetchMock.mock.calls[0][0]).toBe('https://places.googleapis.com/v1/places/abc')

    fetchMock.mockResolvedValueOnce(response({}))
    await expect(fetchParkingOptionsFromPlace('abc')).resolves.toBeNull()
  })
})

describe('resolveParkingFeeForStop', () => {
  it('treats rest areas and service areas as free without calling the API', async () => {
    await expect(
      resolveParkingFeeForStop({ ...stop, category: 'service_area', stay_minutes: 20 })
    ).resolves.toMatchObject({ total_yen: 0, stay_minutes: 20, source: 'free' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('charges the default hourly rate for paid parking from Places', async () => {
    fetchMock.mockResolvedValueOnce(response({ parkingOptions: { paidParking: true } }))
    await expect(
      resolveParkingFeeForStop({ ...stop, stay_minutes: 90 })
    ).resolves.toMatchObject({
      hourly_yen: 300,
      stay_minutes: 90,
      total_yen: 600,
      source: 'places',
    })
  })

  it('reports free parking from Places', async () => {
    fetchMock.mockResolvedValueOnce(response({ parkingOptions: { freeParkingLot: true } }))
    await expect(resolveParkingFeeForStop(stop)).resolves.toMatchObject({
      hourly_yen: 0,
      total_yen: 0,
      source: 'free',
    })
  })

  it('falls back to the category default when Places has no info or fails', async () => {
    fetchMock.mockResolvedValueOnce(response({ parkingOptions: {} }))
    await expect(resolveParkingFeeForStop(stop)).resolves.toMatchObject({
      hourly_yen: 300,
      stay_minutes: 60,
      total_yen: 300,
      source: 'category_default',
    })

    fetchMock.mockRejectedValueOnce(new Error('network'))
    await expect(resolveParkingFeeForStop(stop)).resolves.toMatchObject({
      source: 'category_default',
    })

    // API キー未設定でも例外にせず既定値で計算する
    vi.stubEnv('GOOGLE_CLOUD_API_KEY', '')
    await expect(resolveParkingFeeForStop({ ...stop, stay_minutes: 0 })).resolves.toMatchObject(
      { total_yen: 0, source: 'category_default' }
    )
  })

  it('resolves fees for several stops', async () => {
    fetchMock.mockResolvedValue(response({ parkingOptions: { paidParkingLot: true } }))
    const fees = await resolveParkingFeesForStops([
      stop,
      { ...stop, id: 'sa', category: 'rest_area' },
    ])
    expect(fees.map((fee) => fee.source)).toEqual(['places', 'free'])
  })
})
