import { describe, expect, it } from 'vitest'
import {
  buildDirectRouteSummary,
  buildDestinationRoutingStops,
  isDestinationRoutingStop,
  isDirectRoute,
  usesHighwayForRoute,
} from '@/lib/routes/cost-focused-plan'

describe('cost-focused-plan', () => {
  it('identifies direct routes without tourist stops', () => {
    expect(isDirectRoute('route-1')).toBe(true)
    expect(isDirectRoute('route-2')).toBe(true)
    expect(isDirectRoute('route-custom')).toBe(false)
  })

  it('fixes highway use for direct routes and follows the request otherwise', () => {
    const noHighway = { options: { use_highway: false } }
    const withHighway = { options: { use_highway: true } }

    expect(usesHighwayForRoute('route-1', withHighway)).toBe(false)
    expect(usesHighwayForRoute('route-2', noHighway)).toBe(true)
    expect(usesHighwayForRoute('route-custom', noHighway)).toBe(false)
    expect(usesHighwayForRoute('route-custom', withHighway)).toBe(true)
    expect(usesHighwayForRoute('route-custom')).toBe(true)
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
