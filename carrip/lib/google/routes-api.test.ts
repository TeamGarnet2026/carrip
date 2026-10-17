import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGoogleCloudApiKey, isGoogleCloudConfigured } from '@/lib/google/config'
import { computeRouteMetrics, estimateRouteMetricsLocally } from '@/lib/google/routes-api'
import type { PoiPlace } from '@/lib/google/types'

const origin = { lat: 35.0, lng: 135.0 }
const stops: PoiPlace[] = [
  { id: 'a', name: 'A', address: '', lat: 35.1, lng: 135.0 },
  { id: 'b', name: 'B', address: '', lat: 35.2, lng: 135.0 },
]

const fetchMock = vi.fn()

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function sentBody() {
  return JSON.parse(fetchMock.mock.calls[0][1].body as string)
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

describe('google config', () => {
  it('reports whether the API key is configured', () => {
    expect(isGoogleCloudConfigured()).toBe(true)
    expect(getGoogleCloudApiKey()).toBe('test-key')
    vi.stubEnv('GOOGLE_CLOUD_API_KEY', '')
    expect(isGoogleCloudConfigured()).toBe(false)
    expect(() => getGoogleCloudApiKey()).toThrow('GOOGLE_CLOUD_API_KEY')
  })
})

describe('estimateRouteMetricsLocally', () => {
  it('returns zero for no stops', () => {
    expect(estimateRouteMetricsLocally(origin, [])).toEqual({ distanceKm: 0, durationMin: 0 })
  })

  it('applies a road factor of 1.35 and 40 km/h', () => {
    // 直線 約22.2km × 1.35 ≒ 30km、40km/h で 45分
    expect(estimateRouteMetricsLocally(origin, stops)).toEqual({
      distanceKm: 30,
      durationMin: 45,
    })
  })

  it('adds the way back for round trips and starts from the first stop without an origin', () => {
    expect(estimateRouteMetricsLocally(origin, stops, true).distanceKm).toBe(60)
    expect(estimateRouteMetricsLocally(null, stops).distanceKm).toBe(15)
  })
})

describe('computeRouteMetrics', () => {
  it('returns zero without calling the API when there are no stops', async () => {
    await expect(computeRouteMetrics('京都駅', [])).resolves.toEqual({
      distanceKm: 0,
      durationMin: 0,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('converts meters and seconds from the Routes API', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ routes: [{ distanceMeters: 31_400, duration: '2700s' }] })
    )
    await expect(computeRouteMetrics('京都駅', stops)).resolves.toEqual({
      distanceKm: 31,
      durationMin: 45,
    })

    const body = sentBody()
    expect(body.origin).toEqual({ address: '京都駅' })
    expect(body.destination.location.latLng).toEqual({ latitude: 35.2, longitude: 135.0 })
    expect(body.intermediates).toHaveLength(1)
    expect(body.routingPreference).toBe('TRAFFIC_AWARE')
    expect(fetchMock.mock.calls[0][1].headers['X-Goog-Api-Key']).toBe('test-key')
  })

  it('returns to the origin and avoids highways when requested', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ routes: [{ distanceMeters: 60_000, duration: undefined }] })
    )
    await expect(
      computeRouteMetrics('京都駅', stops, { roundTrip: true, useHighway: false })
    ).resolves.toEqual({ distanceKm: 60, durationMin: 0 })

    const body = sentBody()
    expect(body.destination).toEqual({ address: '京都駅' })
    expect(body.intermediates).toHaveLength(2)
    expect(body.routingPreference).toBe('TRAFFIC_UNAWARE')
    expect(body.routeModifiers).toEqual({ avoidHighways: true, avoidTolls: true })
  })

  it('falls back to a local estimate when the API fails or returns no route', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'quota' }, false))
    await expect(
      computeRouteMetrics('京都駅', stops, { originLatLng: origin })
    ).resolves.toEqual({ distanceKm: 30, durationMin: 45, degraded: true })

    fetchMock.mockResolvedValueOnce(jsonResponse({ routes: [] }))
    await expect(computeRouteMetrics('京都駅', stops)).resolves.toMatchObject({
      degraded: true,
    })
  })
})
