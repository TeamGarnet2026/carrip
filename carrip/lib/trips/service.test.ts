import { describe, expect, it } from 'vitest'
import { createSupabaseMock } from '@/lib/test-utils/supabase-mock'
import {
  createTripForUser,
  deleteTripForUser,
  getTripDetailForUser,
  listTripsForUser,
} from '@/lib/trips/service'
import type { CreateTripInput } from '@/lib/trips/schema'

const input = {
  origin: '京都駅',
  prefecture: ['京都府'],
  departure_date: '2026-10-20',
  days: 1,
  people: 2,
  vehicle: { type: 'compact' },
  round_trip: true,
  route: {
    total_distance_km: 50,
    total_duration_min: 120,
    total_cost: 6000,
    cost_per_person: 3000,
    cost_breakdown: { fuel: 2000, toll: 1000, parking: 2000, admission: 1000 },
    stops: [
      {
        place_id: 'g-kiyomizu',
        name: '清水寺',
        address: '京都府',
        lat: 34.99,
        lng: 135.78,
        parking_yen: 600,
        admission_yen_per_person: 400,
      },
      {
        place_id: 'g-sa',
        name: '桂川PA',
        address: '京都府',
        lat: 34.93,
        lng: 135.72,
        category: 'parking_area',
        is_rest_stop: true,
        stay_minutes: 15,
      },
    ],
  },
} as unknown as CreateTripInput

describe('createTripForUser', () => {
  it('saves the trip, route, reuses known POIs and inserts stops in order', async () => {
    const mock = createSupabaseMock({
      trips: [{ data: { id: 'trip-1' } }],
      routes: [{ data: { id: 'route-1' } }],
      pois: [
        { data: { id: 'poi-existing' } }, // 1件目: 既存 POI を再利用
        { data: null }, // 2件目: 未登録
        { data: { id: 'poi-new' } }, // 2件目: 新規作成
      ],
      route_stops: [{ error: null }],
    })

    const result = await createTripForUser(mock.client, 'user-1', input)
    expect(result).toEqual({
      trip: { id: 'trip-1' },
      route: { id: 'route-1' },
      stop_count: 2,
    })

    const [tripInsert] = mock.argsOf(mock.queriesFor('trips')[0], 'insert') as [
      Record<string, unknown>,
    ]
    expect(tripInsert).toMatchObject({
      owner_id: 'user-1',
      origin: '京都駅',
      vehicle_json: { type: 'compact', round_trip: true },
    })

    const [poiInsert] = mock.argsOf(mock.queriesFor('pois')[2], 'insert') as [
      Record<string, unknown>,
    ]
    expect(poiInsert).toMatchObject({
      google_place_id: 'g-sa',
      prefecture: '京都府',
      category: 'parking_area',
    })

    const [stopRows] = mock.argsOf(mock.queriesFor('route_stops')[0], 'insert') as [
      Array<Record<string, unknown>>,
    ]
    expect(stopRows).toEqual([
      expect.objectContaining({
        poi_id: 'poi-existing',
        stop_order: 1,
        stay_minutes: 60,
        is_rest_stop: false,
        parking_cost: 600,
        admission_fee: 400,
      }),
      expect.objectContaining({
        poi_id: 'poi-new',
        stop_order: 2,
        stay_minutes: 15,
        is_rest_stop: true,
        // 駐車料金が未設定なら、ルート全体の駐車料金を地点数で割った値
        parking_cost: 1000,
        admission_fee: null,
      }),
    ])
  })

  it('omits round_trip from vehicle_json when not specified', async () => {
    const mock = createSupabaseMock({
      trips: [{ data: { id: 'trip-1' } }],
      routes: [{ data: { id: 'route-1' } }],
      pois: [{ data: { id: 'p1' } }, { data: { id: 'p2' } }],
    })
    await createTripForUser(mock.client, 'user-1', { ...input, round_trip: undefined })
    const [tripInsert] = mock.argsOf(mock.queriesFor('trips')[0], 'insert') as [
      { vehicle_json: Record<string, unknown> },
    ]
    expect(tripInsert.vehicle_json).toEqual({ type: 'compact' })
  })

  it('throws with the database message when a step fails', async () => {
    await expect(
      createTripForUser(
        createSupabaseMock({ trips: [{ error: { message: 'trip failed' } }] }).client,
        'user-1',
        input
      )
    ).rejects.toThrow('trip failed')

    await expect(
      createTripForUser(
        createSupabaseMock({ trips: [{ data: { id: 't' } }], routes: [{ data: null }] })
          .client,
        'user-1',
        input
      )
    ).rejects.toThrow('ルートの保存に失敗しました')

    await expect(
      createTripForUser(
        createSupabaseMock({
          trips: [{ data: { id: 't' } }],
          routes: [{ data: { id: 'r' } }],
          pois: [{ data: null }, { error: { message: 'poi failed' } }],
        }).client,
        'user-1',
        input
      )
    ).rejects.toThrow('poi failed')

    await expect(
      createTripForUser(
        createSupabaseMock({
          trips: [{ data: { id: 't' } }],
          routes: [{ data: { id: 'r' } }],
          pois: [{ data: { id: 'p1' } }, { data: { id: 'p2' } }],
          route_stops: [{ error: { message: 'stops failed' } }],
        }).client,
        'user-1',
        input
      )
    ).rejects.toThrow('stops failed')
  })
})

describe('listTripsForUser', () => {
  it('lists the latest 50 trips of the user', async () => {
    const mock = createSupabaseMock({ trips: [{ data: [{ id: 'a' }, { id: 'b' }] }] })
    await expect(listTripsForUser(mock.client, 'user-1')).resolves.toEqual([
      { id: 'a' },
      { id: 'b' },
    ])
    const calls = mock.queriesFor('trips')[0].calls.map((call) => call.method)
    expect(calls).toEqual(['select', 'eq', 'order', 'limit'])
    expect(mock.argsOf(mock.queriesFor('trips')[0], 'limit')).toEqual([50])
  })

  it('returns an empty list or throws on errors', async () => {
    await expect(
      listTripsForUser(createSupabaseMock({ trips: [{ data: null }] }).client, 'u')
    ).resolves.toEqual([])
    await expect(
      listTripsForUser(
        createSupabaseMock({ trips: [{ error: { message: 'denied' } }] }).client,
        'u'
      )
    ).rejects.toThrow('denied')
  })
})

describe('getTripDetailForUser', () => {
  it('returns the trip with routes and stops sorted by stop_order', async () => {
    const mock = createSupabaseMock({
      trips: [{ data: { id: 'trip-1' } }, { data: null }],
      routes: [
        {
          data: [
            {
              id: 'route-1',
              route_stops: [
                { id: 's2', stop_order: 2 },
                { id: 's1', stop_order: 1 },
              ],
            },
          ],
        },
      ],
    })
    const detail = await getTripDetailForUser(mock.client, 'user-1', 'trip-1')
    expect(detail?.trip).toEqual({ id: 'trip-1' })
    expect(detail?.routes[0].stops.map((stop) => stop.id)).toEqual(['s1', 's2'])
    expect(detail?.routes[0]).not.toHaveProperty('route_stops')
    // 最終アクセス日時を更新する
    expect(mock.argsOf(mock.queriesFor('trips')[1], 'update')).toBeDefined()
  })

  it('returns null for trips of other users and throws on errors', async () => {
    await expect(
      getTripDetailForUser(createSupabaseMock({ trips: [{ data: null }] }).client, 'u', 't')
    ).resolves.toBeNull()
    await expect(
      getTripDetailForUser(
        createSupabaseMock({ trips: [{ error: { message: 'trip error' } }] }).client,
        'u',
        't'
      )
    ).rejects.toThrow('trip error')
    await expect(
      getTripDetailForUser(
        createSupabaseMock({
          trips: [{ data: { id: 't' } }],
          routes: [{ error: { message: 'routes error' } }],
        }).client,
        'u',
        't'
      )
    ).rejects.toThrow('routes error')
  })

  it('handles trips without routes', async () => {
    const mock = createSupabaseMock({
      trips: [{ data: { id: 't' } }],
      routes: [{ data: null }],
    })
    const detail = await getTripDetailForUser(mock.client, 'u', 't')
    expect(detail?.routes).toEqual([])
  })
})

describe('deleteTripForUser', () => {
  it('deletes only trips owned by the user', async () => {
    const mock = createSupabaseMock({ trips: [{ data: { id: 't' } }, { error: null }] })
    await expect(deleteTripForUser(mock.client, 'user-1', 't')).resolves.toBe(true)
    const deleteQuery = mock.queriesFor('trips')[1]
    expect(deleteQuery.calls.filter((call) => call.method === 'eq')).toEqual([
      { method: 'eq', args: ['id', 't'] },
      { method: 'eq', args: ['owner_id', 'user-1'] },
    ])
  })

  it('returns false when not found and throws on errors', async () => {
    await expect(
      deleteTripForUser(createSupabaseMock({ trips: [{ data: null }] }).client, 'u', 't')
    ).resolves.toBe(false)
    await expect(
      deleteTripForUser(
        createSupabaseMock({ trips: [{ error: { message: 'find error' } }] }).client,
        'u',
        't'
      )
    ).rejects.toThrow('find error')
    await expect(
      deleteTripForUser(
        createSupabaseMock({
          trips: [{ data: { id: 't' } }, { error: { message: 'delete error' } }],
        }).client,
        'u',
        't'
      )
    ).rejects.toThrow('delete error')
  })
})
