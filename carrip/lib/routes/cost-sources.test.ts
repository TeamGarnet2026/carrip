import { describe, expect, it } from 'vitest'
import {
  aggregateParkingSource,
  recalculateRouteCostsLocally,
  sumStopAdmissionPerPerson,
  sumStopParking,
} from '@/lib/routes/cost-sources'
import type { RouteCandidate, RouteStop } from '@/lib/routes/types'

function makeStop(overrides: Partial<RouteStop> = {}): RouteStop {
  return {
    place_id: 'p1',
    name: '地点',
    address: '住所',
    lat: 35,
    lng: 135,
    ...overrides,
  }
}

describe('aggregateParkingSource', () => {
  it('surfaces low-confidence estimate when any stop is estimated', () => {
    const source = aggregateParkingSource([
      { parking_source: 'places', parking_yen: 300 },
      { parking_source: 'category_default', parking_yen: 300 },
    ])
    expect(source).toBe('category_default')
  })

  it('reports manual when user has overridden and no estimates remain', () => {
    const source = aggregateParkingSource([
      { parking_source: 'manual', parking_yen: 500 },
      { parking_source: 'free', parking_yen: 0 },
    ])
    expect(source).toBe('manual')
  })

  it('reports free when all stops are free', () => {
    expect(
      aggregateParkingSource([
        { parking_source: 'free', parking_yen: 0 },
        { parking_source: 'free', parking_yen: 0 },
      ])
    ).toBe('free')
  })
})

describe('recalculateRouteCostsLocally', () => {
  const baseRoute: RouteCandidate = {
    id: 'route-1',
    title: 'テスト',
    summary: '',
    transport_mode: 'car',
    stops: [],
    polyline: [],
    sections: [],
    cost_breakdown: { fuel: 1000, toll: 2000, parking: 600, admission: 800 },
    total_distance_km: 100,
    total_duration_min: 120,
    total_cost: 4400,
    cost_per_person: 2200,
  }

  it('updates parking and admission without touching fuel/toll', () => {
    const stops = [
      makeStop({
        place_id: 'a',
        parking_yen: 1000,
        parking_source: 'manual',
        admission_yen_per_person: 500,
      }),
      makeStop({
        place_id: 'b',
        parking_yen: 0,
        parking_source: 'free',
        admission_yen_per_person: 0,
      }),
    ]

    const updated = recalculateRouteCostsLocally(baseRoute, stops, 2)

    expect(updated.cost_breakdown.fuel).toBe(1000)
    expect(updated.cost_breakdown.toll).toBe(2000)
    expect(updated.cost_breakdown.parking).toBe(1000)
    expect(updated.cost_breakdown.admission).toBe(1000)
    expect(updated.total_cost).toBe(5000)
    expect(updated.cost_per_person).toBe(2500)
    expect(updated.cost_sources?.parking).toBe('manual')
  })

  it('sums helper functions correctly', () => {
    const stops = [
      makeStop({ parking_yen: 300, admission_yen_per_person: 400 }),
      makeStop({ place_id: 'p2', parking_yen: 200, admission_yen_per_person: 100 }),
    ]
    expect(sumStopParking(stops)).toBe(500)
    expect(sumStopAdmissionPerPerson(stops)).toBe(500)
  })
})
