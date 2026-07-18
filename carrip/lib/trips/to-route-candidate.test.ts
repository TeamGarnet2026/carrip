import { describe, expect, it } from 'vitest'
import {
  tripDetailToCandidates,
  tripRouteToCandidate,
  type TripDetail,
} from '@/lib/trips/to-route-candidate'

const baseTrip = {
  id: 'trip-1',
  owner_id: 'user-1',
  origin: '東京駅',
  prefecture: ['京都府'],
  departure_date: '2026-08-01',
  days: 2,
  people: 3,
  vehicle_json: { type: 'compact' },
  last_accessed_at: '2026-07-10T00:00:00Z',
  created_at: '2026-07-10T00:00:00Z',
  updated_at: null,
} as TripDetail['trip']

const baseRoute = {
  id: 'route-1',
  trip_id: 'trip-1',
  rank: 1,
  total_distance_km: 450,
  total_duration_min: 360,
  total_cost: 18000,
  cost_per_person: 6000,
  cost_breakdown_json: {
    fuel: 5000,
    toll: 8000,
    parking: 3000,
    admission: 2000,
  },
  is_confirmed: true,
  score: null,
  created_at: '2026-07-10T00:00:00Z',
  updated_at: null,
  stops: [
    {
      id: 'stop-1',
      stop_order: 1,
      stay_minutes: 90,
      parking_cost: 600,
      admission_fee: 400,
      is_rest_stop: false,
      pois: {
        id: 'poi-1',
        google_place_id: 'places/a',
        name: '清水寺',
        lat: 34.9949,
        lng: 135.785,
        prefecture: '京都府',
        category: 'tourist',
        rating: 4.5,
      },
    },
    {
      id: 'stop-2',
      stop_order: 2,
      stay_minutes: 30,
      parking_cost: 0,
      admission_fee: null,
      is_rest_stop: true,
      pois: {
        id: 'poi-2',
        google_place_id: 'places/b',
        name: '道の駅',
        lat: 35.1,
        lng: 135.9,
        prefecture: '滋賀県',
        category: 'rest_area',
        rating: null,
      },
    },
  ],
} as TripDetail['routes'][number]

describe('tripRouteToCandidate', () => {
  it('maps DB route to RouteCandidate for proposal-style UI', () => {
    const candidate = tripRouteToCandidate(baseRoute, baseTrip)

    expect(candidate.id).toBe('route-1')
    expect(candidate.title).toBe('東京駅 → 京都府')
    expect(candidate.stops).toHaveLength(2)
    expect(candidate.stops[0]).toMatchObject({
      place_id: 'places/a',
      name: '清水寺',
      parking_yen: 600,
      admission_yen_per_person: 400,
      is_rest_stop: false,
    })
    expect(candidate.stops[1].is_rest_stop).toBe(true)
    expect(candidate.polyline).toHaveLength(2)
    expect(candidate.cost_breakdown).toEqual({
      fuel: 5000,
      toll: 8000,
      parking: 3000,
      admission: 2000,
    })
    expect(candidate.total_cost).toBe(18000)
  })

  it('converts all routes in a trip detail', () => {
    const detail: TripDetail = {
      trip: baseTrip,
      routes: [baseRoute],
    }
    expect(tripDetailToCandidates(detail)).toHaveLength(1)
  })
})
