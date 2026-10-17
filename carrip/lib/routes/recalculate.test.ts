import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteRecalculateInput } from '@/lib/routes/schema'
import type { RouteCandidate, RouteStop } from '@/lib/routes/types'

const geocodeAddress = vi.fn()
const resolveFuelPriceForVehicle = vi.fn()
const resolveDestinationPoints = vi.fn()
const buildSingleRoute = vi.fn()

vi.mock('@/lib/google/places', () => ({
  geocodeAddress: (...args: unknown[]) => geocodeAddress(...args),
}))
vi.mock('@/lib/prices/fuel', () => ({
  resolveFuelPriceForVehicle: (...args: unknown[]) => resolveFuelPriceForVehicle(...args),
}))
vi.mock('@/lib/routes/build', () => ({
  resolveDestinationPoints: (...args: unknown[]) => resolveDestinationPoints(...args),
}))
vi.mock('@/lib/routes/build-route', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/routes/build-route')>()),
  buildSingleRoute: (...args: unknown[]) => buildSingleRoute(...args),
}))

const { recalculateRoute, recalculateRouteStub } = await import('@/lib/routes/recalculate')

function stop(id: string, extra: Partial<RouteStop> = {}): RouteStop {
  return { place_id: id, name: id, address: '京都府', lat: 35, lng: 135.7, ...extra }
}

function input(routeId: string, stops: RouteStop[], roundTrip = false): RouteRecalculateInput {
  return {
    route_id: routeId,
    stops,
    request: {
      origin: '京都駅',
      prefecture: ['京都府'],
      departure_date: '2026-10-20',
      days: 1,
      people: 2,
      vehicle: { type: 'compact' },
      options: { round_trip: roundTrip },
    },
  } as RouteRecalculateInput
}

const builtRoute = {
  stops: [stop('a')],
  polyline: [{ lat: 1, lng: 2 }],
  sections: [],
  cost_breakdown: { fuel: 1000, toll: 500, parking: 300, admission: 0 },
  cost_sources: { fuel: 'enecho_db' },
  total_distance_km: 40,
  total_duration_min: 60,
  total_cost: 1800,
  cost_per_person: 900,
  departure_time: '2026-10-20T08:00',
  arrival_time: '2026-10-20T09:00',
  round_trip: false,
} as unknown as RouteCandidate

beforeEach(() => {
  geocodeAddress.mockReset().mockResolvedValue({ lat: 34.98, lng: 135.75 })
  resolveFuelPriceForVehicle
    .mockReset()
    .mockResolvedValue({ price_yen: 170, source: 'enecho_db' })
  resolveDestinationPoints.mockReset().mockResolvedValue([{ lat: 35.0, lng: 135.76 }])
  buildSingleRoute.mockReset().mockResolvedValue({ route: builtRoute })
})

describe('recalculateRoute', () => {
  it('rebuilds the custom route with the edited stops as presets', async () => {
    const stops = [stop('a', { parking_yen: 0, parking_source: 'manual' })]
    const result = await recalculateRoute(input('route-custom', stops))

    const args = buildSingleRoute.mock.calls[0][0]
    expect(args).toMatchObject({
      routeId: 'route-custom',
      origin: { lat: 34.98, lng: 135.75 },
      directRoute: false,
      fuelPrice: { price_yen: 170 },
    })
    expect(args.pathStops.map((place: { id: string }) => place.id)).toEqual(['a'])
    expect(args.presetStops.get('a')).toMatchObject({ parking_source: 'manual' })
    expect(resolveFuelPriceForVehicle).toHaveBeenCalledWith('京都府', { type: 'compact' })

    expect(result).toMatchObject({
      total_cost: 1800,
      cost_per_person: 900,
      degraded: false,
    })
  })

  it('re-inserts destination waypoints for direct routes', async () => {
    await recalculateRoute(input('route-1', [stop('rest', { is_rest_stop: true })]))
    const args = buildSingleRoute.mock.calls[0][0]
    // 休憩地点だけなら直行ルートのまま（駐車場代・入場料は計上しない）
    expect(args.directRoute).toBe(true)
    expect(args.pathStops.every((place: { category?: string }) => place.category === 'destination')).toBe(true)
    expect(resolveDestinationPoints).toHaveBeenCalledWith(['京都府'])
  })

  it('treats a direct route as a normal route once a tourist stop is added', async () => {
    await recalculateRoute(input('route-2', [stop('tourist')]))
    const args = buildSingleRoute.mock.calls[0][0]
    expect(args.directRoute).toBe(false)
    expect(args.pathStops[0].id).toBe('tourist')
  })

  it('reports degraded results', async () => {
    buildSingleRoute.mockResolvedValueOnce({ route: builtRoute, degradedReason: 'navitime' })
    await expect(recalculateRoute(input('route-custom', [stop('a')]))).resolves.toMatchObject({
      degraded: true,
    })
  })

  it('fails when the origin cannot be geocoded', async () => {
    geocodeAddress.mockResolvedValueOnce(null)
    await expect(recalculateRoute(input('route-custom', [stop('a')]))).rejects.toThrow(
      '出発地「京都駅」の位置情報を取得できませんでした'
    )
  })

  it('uses Tokyo for fuel prices when no prefecture is given', async () => {
    const request = input('route-custom', [stop('a')])
    request.request.prefecture = []
    await recalculateRoute(request)
    expect(resolveFuelPriceForVehicle).toHaveBeenCalledWith('東京都', { type: 'compact' })
  })
})

describe('recalculateRouteStub', () => {
  it('estimates metrics locally and sums parking and admission', async () => {
    const stops = [
      stop('a', { lat: 35.0, parking_yen: 500, admission_yen_per_person: 400 }),
      stop('b', { lat: 35.1, parking_yen: 300, admission_yen_per_person: 0 }),
      stop('rest', { lat: 35.2, is_rest_stop: true, admission_yen_per_person: 999 }),
    ]
    const result = await recalculateRouteStub(input('route-custom', stops))

    expect(result.degraded).toBe(true)
    expect(result.stops).toBe(stops)
    expect(result.cost_breakdown.parking).toBe(800)
    // 休憩地点の入場料は含めない：(400 + 0) × 2人
    expect(result.cost_breakdown.admission).toBe(800)
    expect(result.cost_breakdown.toll).toBe(0)
    expect(result.cost_sources).toMatchObject({ fuel: 'enecho_db', toll: 'estimate' })
    expect(result.total_distance_km).toBeGreaterThan(0)
    expect(result.polyline).toHaveLength(3)
    expect(result.total_cost).toBe(
      result.cost_breakdown.fuel +
        result.cost_breakdown.toll +
        result.cost_breakdown.parking +
        result.cost_breakdown.admission
    )
    expect(result.cost_per_person).toBe(Math.round(result.total_cost / 2))
  })

  it('marks round trips', async () => {
    const result = await recalculateRouteStub(input('route-custom', [stop('a')], true))
    expect(result.round_trip).toBe(true)
  })
})
