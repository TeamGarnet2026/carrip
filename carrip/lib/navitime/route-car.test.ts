import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  conditionForHighwayUse,
  getNavitimeConfig,
  isNavitimeConfigured,
} from '@/lib/navitime/config'
import { fetchNavitimeCarRoute } from '@/lib/navitime/route-car'
import type { RouteGenerateRequest } from '@/lib/routes/types'

const fetchMock = vi.fn()

// 平日の昼（ETC の時間帯割引がかからない時間）
const request: RouteGenerateRequest = {
  origin: '京都駅',
  prefecture: ['京都府'],
  departure_date: '2026-10-20',
  days: 1,
  people: 2,
  vehicle: { type: 'sedan' },
  options: { departure_time: '12:00' },
}

const origin = { lat: 34.98, lng: 135.75 }
const stops = [
  { name: '清水寺', lat: 34.99, lng: 135.78 },
  { name: '嵐山', lat: 35.01, lng: 135.67 },
]

const navitimeItem = {
  summary: {
    move: {
      distance: 23_456,
      time: 52,
      fare: { unit_1025_2: 1200, unit_1024_2: 1500 },
      from_time: '2026-10-20T12:00:00+09:00',
      to_time: '2026-10-20T12:52:00+09:00',
    },
  },
  sections: [
    { type: 'point', name: '出発地' },
    { type: 'move', distance: 12_345, time: 30 },
    { type: 'point' },
    { type: 'other', name: 'ignored' },
  ],
  shapes: {
    features: [
      { geometry: { type: 'LineString', coordinates: [[135.75, 34.98], [135.78, 34.99]] } },
      { geometry: { type: 'Point', coordinates: [[0, 0]] } },
      { geometry: { type: 'LineString' } },
    ],
  },
}

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body }
}

function requestedUrl() {
  return new URL(fetchMock.mock.calls[0][0] as string)
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('RAPIDAPI_KEY', 'rapid-key')
  vi.stubEnv('RAPIDAPI_HOST', 'navitime.example')
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('navitime config', () => {
  it('requires both key and host', () => {
    expect(isNavitimeConfigured()).toBe(true)
    expect(getNavitimeConfig()).toEqual({ apiKey: 'rapid-key', host: 'navitime.example' })
    vi.stubEnv('RAPIDAPI_HOST', '')
    expect(isNavitimeConfigured()).toBe(false)
    expect(() => getNavitimeConfig()).toThrow('RAPIDAPI_KEY')
  })

  it('maps highway use to a route condition', () => {
    expect(conditionForHighwayUse(true)).toBe('toll_time')
    expect(conditionForHighwayUse(false)).toBe('free_only')
  })
})

describe('fetchNavitimeCarRoute', () => {
  it('builds the request and converts the response', async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [navitimeItem] }))

    const result = await fetchNavitimeCarRoute({
      request,
      routeId: 'route-custom',
      origin,
      stops,
    })

    const url = requestedUrl()
    expect(url.host).toBe('navitime.example')
    expect(url.searchParams.get('start')).toBe('34.98,135.75')
    expect(url.searchParams.get('goal')).toBe('35.01,135.67')
    expect(JSON.parse(url.searchParams.get('via') ?? '[]')).toEqual([
      { lat: 34.99, lon: 135.78, name: '清水寺' },
    ])
    expect(url.searchParams.get('condition')).toBe('toll_time')
    expect(url.searchParams.get('start_time')).toBe('2026-10-20T12:00:00')
    expect(url.searchParams.get('etc')).toBe('use')
    expect(fetchMock.mock.calls[0][1].headers['x-rapidapi-key']).toBe('rapid-key')

    expect(result).toEqual({
      distanceKm: 23.5,
      durationMin: 52,
      tollYen: 1200,
      polyline: [
        { lat: 34.98, lng: 135.75 },
        { lat: 34.99, lng: 135.78 },
      ],
      sections: [
        { type: 'point', name: '出発地', distance_km: undefined, duration_min: undefined },
        { type: 'move', name: '走行', distance_km: 12.3, duration_min: 30 },
        { type: 'point', name: '地点', distance_km: undefined, duration_min: undefined },
      ],
      departureTime: '2026-10-20T12:00:00+09:00',
      arrivalTime: '2026-10-20T12:52:00+09:00',
    })
  })

  it('returns to the origin, avoids tolls and uses cash fares when requested', async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [navitimeItem] }))
    const result = await fetchNavitimeCarRoute({
      request: {
        ...request,
        options: { round_trip: true, etc_card: false, departure_time: '12:00:00' },
      },
      routeId: 'route-1',
      origin,
      stops,
    })

    const url = requestedUrl()
    expect(url.searchParams.get('goal')).toBe('34.98,135.75')
    expect(JSON.parse(url.searchParams.get('via') ?? '[]')).toHaveLength(2)
    expect(url.searchParams.get('condition')).toBe('free_only')
    expect(url.searchParams.get('etc')).toBeNull()
    expect(url.searchParams.get('start_time')).toBe('2026-10-20T12:00:00')
    expect(result.tollYen).toBe(1500)
  })

  it('defaults the departure time to 08:00 and omits via for a single stop', async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [navitimeItem] }))
    await fetchNavitimeCarRoute({
      request: { ...request, options: undefined },
      routeId: 'route-2',
      origin,
      stops: [stops[0]],
    })
    const url = requestedUrl()
    expect(url.searchParams.get('start_time')).toBe('2026-10-20T08:00:00')
    expect(url.searchParams.get('via')).toBeNull()
  })

  it('rejects requests without stops', async () => {
    await expect(
      fetchNavitimeCarRoute({ request, routeId: 'route-custom', origin, stops: [] })
    ).rejects.toThrow('停留地がありません')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws on API errors and invalid routes', async () => {
    fetchMock.mockResolvedValueOnce(response({ message: 'rate limited' }, false, 429))
    await expect(
      fetchNavitimeCarRoute({ request, routeId: 'route-custom', origin, stops })
    ).rejects.toThrow('rate limited')

    fetchMock.mockResolvedValueOnce(response({}, false, 500))
    await expect(
      fetchNavitimeCarRoute({ request, routeId: 'route-custom', origin, stops })
    ).rejects.toThrow('NAVITIME API エラー (500)')

    fetchMock.mockResolvedValueOnce(response({ items: [{ summary: { move: { time: 10 } } }] }))
    await expect(
      fetchNavitimeCarRoute({ request, routeId: 'route-custom', origin, stops })
    ).rejects.toThrow('有効な車ルート')
  })
})
