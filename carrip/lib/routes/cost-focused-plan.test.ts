import { describe, expect, it } from 'vitest'
import {
  buildDirectRouteSummary,
  buildDestinationRoutingStops,
  isCostFocusedRoute,
  isDestinationRoutingStop,
  isDirectRoute,
  usesHighwayForRoute,
} from '@/lib/routes/cost-focused-plan'

describe('cost-focused-plan', () => {
  it('identifies direct routes without tourist stops', () => {
    expect(isDirectRoute('route-1')).toBe(true)
    expect(isDirectRoute('route-2')).toBe(true)
    expect(isDirectRoute('route-3')).toBe(false)
    expect(isCostFocusedRoute('route-1')).toBe(true)
    expect(isCostFocusedRoute('route-2')).toBe(false)
  })

  it('uses highways except for the cost-focused route', () => {
    expect(usesHighwayForRoute('route-1')).toBe(false)
    expect(usesHighwayForRoute('route-2')).toBe(true)
    expect(usesHighwayForRoute('route-3')).toBe(true)
  })

  it('builds destination routing stops from prefecture centers', () => {
    expect(
      buildDestinationRoutingStops(['京都府'], [{ lat: 35, lng: 135.7 }])
    ).toEqual([
      {
        id: 'destination-0',
        name: '京都府',
        lat: 35,
        lng: 135.7,
      },
    ])
  })

  it('builds direct-route summaries', () => {
    const request = {
      origin: '名古屋',
      prefecture: ['京都府'],
      departure_date: '2026-07-11',
      days: 2,
      people: 2,
      vehicle: { type: 'compact' },
    }
    expect(buildDirectRouteSummary('route-1', request)).toContain('一般道のみ')
    expect(buildDirectRouteSummary('route-2', request)).toContain('高速道路のみ')
  })

  it('identifies internal destination waypoints', () => {
    expect(isDestinationRoutingStop('destination-0')).toBe(true)
    expect(isDestinationRoutingStop('places/abc')).toBe(false)
  })
})
