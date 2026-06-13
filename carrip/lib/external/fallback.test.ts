import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNavitimeCarRouteWithFallback } from '@/lib/external/fallback'
import * as routesApi from '@/lib/google/routes-api'
import * as routeCar from '@/lib/navitime/route-car'
import type { RouteGenerateRequest } from '@/lib/routes/types'

const baseRequest: RouteGenerateRequest = {
  origin: '京都駅',
  prefecture: ['愛知県'],
  departure_date: '2026-06-08',
  days: 2,
  people: 4,
  vehicle: { type: 'compact' },
}

describe('fetchNavitimeCarRouteWithFallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns NAVITIME metrics when API succeeds', async () => {
    vi.spyOn(routeCar, 'fetchNavitimeCarRoute').mockResolvedValue({
      distanceKm: 120,
      durationMin: 90,
      tollYen: 3500,
      polyline: [{ lat: 35, lng: 135 }],
      sections: [{ type: 'move', name: '名古屋高速', distance_km: 120, duration_min: 90 }],
    })

    const result = await fetchNavitimeCarRouteWithFallback({
      request: baseRequest,
      routeId: 'route-1',
      origin: { lat: 35.0116, lng: 135.7681 },
      stops: [{ name: '名古屋城', lat: 35.1854, lng: 136.8996 }],
    })

    expect(result.degraded).toBe(false)
    expect(result.tollYen).toBe(3500)
    expect(result.distanceKm).toBe(120)
  })

  it('uses estimated metrics when NAVITIME fails', async () => {
    vi.spyOn(routeCar, 'fetchNavitimeCarRoute').mockRejectedValue(
      new Error('NAVITIME down')
    )
    vi.spyOn(routesApi, 'computeRouteMetrics').mockResolvedValue({
      distanceKm: 130,
      durationMin: 100,
    })

    const result = await fetchNavitimeCarRouteWithFallback({
      request: baseRequest,
      routeId: 'route-1',
      origin: { lat: 35.0116, lng: 135.7681 },
      stops: [{ name: '名古屋城', lat: 35.1854, lng: 136.8996 }],
    })

    expect(result.degraded).toBe(true)
    expect(result.degraded_reason).toBe('navitime')
    expect(result.tollYen).toBe(0)
    expect(result.distanceKm).toBe(130)
  })

  it('marks google_routes degradation when both NAVITIME and Routes fail', async () => {
    vi.spyOn(routeCar, 'fetchNavitimeCarRoute').mockRejectedValue(
      new Error('NAVITIME down')
    )
    vi.spyOn(routesApi, 'computeRouteMetrics').mockResolvedValue({
      distanceKm: 125,
      durationMin: 95,
      degraded: true,
    })

    const result = await fetchNavitimeCarRouteWithFallback({
      request: baseRequest,
      routeId: 'route-1',
      origin: { lat: 35.0116, lng: 135.7681 },
      stops: [{ name: '名古屋城', lat: 35.1854, lng: 136.8996 }],
    })

    expect(result.degraded).toBe(true)
    expect(result.degraded_reason).toBe('google_routes')
    expect(result.tollYen).toBe(0)
  })
})
