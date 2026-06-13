import { describe, expect, it } from 'vitest'
import { createTripSchema } from '@/lib/trips/schema'

describe('createTripSchema', () => {
  it('validates a minimal trip save payload', () => {
    const parsed = createTripSchema.parse({
      origin: '京都駅',
      prefecture: ['京都府'],
      departure_date: '2026-06-08',
      days: 2,
      people: 4,
      vehicle: { type: 'compact' },
      route: {
        id: 'route-1',
        title: '京都満喫コース',
        summary: 'テスト',
        transport_mode: 'car',
        stops: [
          {
            place_id: 'ChIJ123',
            name: '清水寺',
            address: '京都府京都市',
            lat: 34.9949,
            lng: 135.785,
          },
        ],
        polyline: [{ lat: 35.0, lng: 135.7 }],
        sections: [{ type: 'move', name: '走行', duration_min: 60 }],
        cost_breakdown: { fuel: 1000, toll: 2000, parking: 300, admission: 0 },
        total_distance_km: 80,
        total_duration_min: 120,
        total_cost: 3300,
        cost_per_person: 825,
      },
    })

    expect(parsed.route.stops).toHaveLength(1)
  })
})
