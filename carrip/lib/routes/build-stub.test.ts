import { describe, expect, it } from 'vitest'
import { buildRoutesStub } from '@/lib/routes/build-stub'
import type { RouteGenerateRequest, RouteStop } from '@/lib/routes/types'

const request: RouteGenerateRequest = {
  origin: '京都駅',
  prefecture: ['京都府'],
  departure_date: '2026-10-20',
  days: 1,
  people: 2,
  vehicle: { type: 'compact' },
}

const userStop: RouteStop = {
  place_id: 'user-1',
  name: '清水寺',
  address: '京都府',
  lat: 34.9949,
  lng: 135.785,
}

describe('buildRoutesStub', () => {
  it('returns the custom route and two direct routes', () => {
    const result = buildRoutesStub({ request })
    expect(result.routes.map((route) => route.id)).toEqual([
      'route-custom',
      'route-1',
      'route-2',
    ])
    expect(result.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('uses sample stops when no stops are given', () => {
    const [custom] = buildRoutesStub({ request }).routes
    expect(custom.stops).toHaveLength(3)
    expect(custom.stops[0].place_id).toBe('stub-kiyomizu')
  })

  it('fills missing costs on user stops but keeps user-provided values', () => {
    const [custom] = buildRoutesStub({
      request,
      stops: [userStop, { ...userStop, place_id: 'user-2', parking_yen: 0 }],
    }).routes
    expect(custom.stops[0]).toMatchObject({
      place_id: 'user-1',
      is_rest_stop: false,
      parking_yen: 600,
      parking_source: 'category_default',
      admission_yen_per_person: 400,
    })
    expect(custom.stops[1].parking_yen).toBe(0)
  })

  it('charges parking and admission only on the custom route', () => {
    const [custom, costFocused] = buildRoutesStub({ request }).routes
    // サンプル: 駐車 600 + 300 + 1000、入場 (400 + 500 + 0) × 2人
    expect(custom.cost_breakdown.parking).toBe(1900)
    expect(custom.cost_breakdown.admission).toBe(1800)
    expect(costFocused.cost_breakdown.parking).toBe(0)
    expect(costFocused.cost_breakdown.admission).toBe(0)
    expect(costFocused.stops).toEqual([])
  })

  it('sums the breakdown into total and per-person costs', () => {
    for (const route of buildRoutesStub({ request }).routes) {
      const { fuel, toll, parking, admission } = route.cost_breakdown
      expect(route.total_cost).toBe(fuel + toll + parking + admission)
      expect(route.cost_per_person).toBe(Math.round(route.total_cost / 2))
    }
  })

  it('scales distance and costs with the number of days', () => {
    const oneDay = buildRoutesStub({ request }).routes[1]
    const twoDays = buildRoutesStub({ request: { ...request, days: 2 } }).routes[1]
    expect(twoDays.total_distance_km).toBe(oneDay.total_distance_km * 2)
    expect(twoDays.cost_breakdown.fuel).toBe(oneDay.cost_breakdown.fuel * 2)
  })

  it('returns to the origin on round trips', () => {
    const routes = buildRoutesStub({
      request: { ...request, options: { round_trip: true } },
    }).routes
    for (const route of routes) {
      expect(route.round_trip).toBe(true)
      expect(route.polyline[0]).toEqual(route.polyline[route.polyline.length - 1])
    }
  })

  it('draws direct routes origin → destination for one-way trips', () => {
    const [custom, direct] = buildRoutesStub({ request }).routes
    expect(direct.polyline).toHaveLength(2)
    expect(custom.polyline).toHaveLength(custom.stops.length)
    expect(direct.summary).toContain('直行')
  })
})
