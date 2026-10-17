import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGoogleMapsApiKey } from '@/lib/google/maps-key'
import { collectRoutePoints, getDefaultMapCenter } from '@/lib/maps/bounds'
import { getRouteColor, ROUTE_COLORS } from '@/lib/maps/route-colors'
import { driverChangeBadgeLabel, stopCategoryLabel } from '@/lib/poi/stop-labels'
import type { RouteCandidate } from '@/lib/routes/types'

function route(partial: Partial<RouteCandidate>): RouteCandidate {
  return {
    id: 'route-custom',
    title: '',
    summary: '',
    transport_mode: 'car',
    stops: [],
    polyline: [],
    sections: [],
    cost_breakdown: { fuel: 0, toll: 0, parking: 0, admission: 0 },
    total_distance_km: 0,
    total_duration_min: 0,
    total_cost: 0,
    cost_per_person: 0,
    ...partial,
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('collectRoutePoints', () => {
  it('collects polyline points and stops of every route', () => {
    const routes = [
      route({
        polyline: [{ lat: 1, lng: 2 }],
        stops: [{ place_id: 'a', name: 'A', address: '', lat: 3, lng: 4 }],
      }),
      route({ polyline: [{ lat: 5, lng: 6 }] }),
    ]
    expect(collectRoutePoints(routes)).toEqual([
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
      { lat: 5, lng: 6 },
    ])
  })
})

describe('getDefaultMapCenter', () => {
  it('uses the first polyline point, then the first stop', () => {
    expect(getDefaultMapCenter([route({ polyline: [{ lat: 1, lng: 2 }] })])).toEqual({
      lat: 1,
      lng: 2,
    })
    expect(
      getDefaultMapCenter([
        route({ stops: [{ place_id: 'a', name: 'A', address: '', lat: 3, lng: 4 }] }),
      ])
    ).toEqual({ lat: 3, lng: 4 })
  })

  it('falls back to Kyoto when there are no routes', () => {
    expect(getDefaultMapCenter([])).toEqual({ lat: 35.0116, lng: 135.7681 })
  })
})

describe('getRouteColor', () => {
  it('uses the fixed color for known route ids and cycles otherwise', () => {
    expect(getRouteColor('route-1', 5)).toBe(ROUTE_COLORS['route-1'])
    expect(getRouteColor('unknown', 0)).toBe('#9333ea')
    expect(getRouteColor('unknown', 4)).toBe('#16a34a')
  })
})

describe('stop labels', () => {
  it('maps rest-stop categories to short labels', () => {
    expect(stopCategoryLabel('service_area')).toBe('SA')
    expect(stopCategoryLabel('parking_area')).toBe('PA')
    expect(stopCategoryLabel('rest_area')).toBe('道の駅')
    expect(stopCategoryLabel('convenience_store')).toBe('コンビニ')
    expect(stopCategoryLabel('tourist')).toBeNull()
    expect(stopCategoryLabel(null)).toBeNull()
  })

  it('builds the driver-change badge', () => {
    expect(driverChangeBadgeLabel('service_area')).toBe('運転交代・SA')
    expect(driverChangeBadgeLabel('tourist', true)).toBe('運転交代')
    expect(driverChangeBadgeLabel('tourist', false)).toBeNull()
  })
})

describe('getGoogleMapsApiKey', () => {
  it('returns the public maps key or an empty string', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'maps-key')
    expect(getGoogleMapsApiKey()).toBe('maps-key')
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', undefined)
    expect(getGoogleMapsApiKey()).toBe('')
  })
})
