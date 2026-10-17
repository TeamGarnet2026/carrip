import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createShareForRoute, getShareByShortCode } from '@/lib/share/service'
import { createSupabaseMock } from '@/lib/test-utils/supabase-mock'

const BASE_URL = 'https://carrip.example'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-10T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('createShareForRoute', () => {
  it('reuses an unexpired share of the same route', async () => {
    const mock = createSupabaseMock({
      routes: [{ data: { id: 'r1', trip_id: 't1' } }],
      trips: [{ data: { owner_id: 'u1' } }],
      shares: [{ data: { short_code: 'abc12345', expires_at: '2026-10-15T00:00:00Z' } }],
    })
    await expect(createShareForRoute(mock.client, 'r1', 'u1', BASE_URL)).resolves.toEqual({
      short_code: 'abc12345',
      share_url: 'https://carrip.example/share/abc12345',
      expires_at: '2026-10-15T00:00:00Z',
    })
    expect(mock.queriesFor('shares')).toHaveLength(1)
  })

  it('creates a new 8-character code that expires in 7 days', async () => {
    const mock = createSupabaseMock({
      routes: [{ data: { id: 'r1', trip_id: 't1' } }],
      trips: [{ data: { owner_id: 'u1' } }],
      shares: [
        { data: null },
        { data: { short_code: 'zzzz0000', expires_at: '2026-10-17T00:00:00.000Z' } },
      ],
    })
    const result = await createShareForRoute(mock.client, 'r1', 'u1', BASE_URL)
    expect(result?.share_url).toBe('https://carrip.example/share/zzzz0000')

    const [inserted] = mock.argsOf(mock.queriesFor('shares')[1], 'insert') as [
      Record<string, string>,
    ]
    expect(inserted.short_code).toMatch(/^[a-z0-9]{8}$/)
    expect(inserted).toMatchObject({
      route_id: 'r1',
      created_by: 'u1',
      expires_at: '2026-10-17T00:00:00.000Z',
    })
  })

  it('retries with a new code when the insert collides', async () => {
    const mock = createSupabaseMock({
      routes: [{ data: { id: 'r1', trip_id: 't1' } }],
      trips: [{ data: { owner_id: 'u1' } }],
      shares: [
        { data: null },
        { error: { message: 'duplicate key' } },
        { data: { short_code: 'second00', expires_at: '2026-10-17T00:00:00Z' } },
      ],
    })
    const result = await createShareForRoute(mock.client, 'r1', 'u1', BASE_URL)
    expect(result?.short_code).toBe('second00')
    expect(mock.queriesFor('shares')).toHaveLength(3)
  })

  it('gives up after 5 failed attempts', async () => {
    const mock = createSupabaseMock({
      routes: [{ data: { id: 'r1', trip_id: 't1' } }],
      trips: [{ data: { owner_id: 'u1' } }],
      shares: [{ data: null }, ...Array(5).fill({ error: { message: 'duplicate' } })],
    })
    await expect(createShareForRoute(mock.client, 'r1', 'u1', BASE_URL)).rejects.toThrow(
      '共有URLの生成に失敗しました'
    )
  })

  it('returns null for missing routes or routes of other users', async () => {
    await expect(
      createShareForRoute(
        createSupabaseMock({ routes: [{ data: null }] }).client,
        'r1',
        'u1',
        BASE_URL
      )
    ).resolves.toBeNull()
    await expect(
      createShareForRoute(
        createSupabaseMock({
          routes: [{ data: { id: 'r1', trip_id: 't1' } }],
          trips: [{ data: { owner_id: 'someone-else' } }],
        }).client,
        'r1',
        'u1',
        BASE_URL
      )
    ).resolves.toBeNull()
  })

  it('throws on database errors', async () => {
    await expect(
      createShareForRoute(
        createSupabaseMock({ routes: [{ error: { message: 'route error' } }] }).client,
        'r1',
        'u1',
        BASE_URL
      )
    ).rejects.toThrow('route error')
    await expect(
      createShareForRoute(
        createSupabaseMock({
          routes: [{ data: { id: 'r1', trip_id: 't1' } }],
          trips: [{ error: { message: 'trip error' } }],
        }).client,
        'r1',
        'u1',
        BASE_URL
      )
    ).rejects.toThrow('trip error')
  })
})

describe('getShareByShortCode', () => {
  const share = {
    short_code: 'abc12345',
    route_id: 'r1',
    expires_at: '2026-10-15T00:00:00Z',
  }

  it('returns the route, stops and trip of a valid share', async () => {
    const mock = createSupabaseMock({
      shares: [{ data: share }],
      routes: [{ data: { id: 'r1', total_cost: 6000 } }, { data: { trip_id: 't1' } }],
      route_stops: [{ data: [{ stop_order: 1 }] }],
      trips: [{ data: { origin: '京都駅' } }],
    })
    await expect(getShareByShortCode(mock.client, 'abc12345')).resolves.toEqual({
      status: 'ok',
      share,
      route: { id: 'r1', total_cost: 6000 },
      stops: [{ stop_order: 1 }],
      trip: { origin: '京都駅' },
    })
  })

  it('reports not_found and expired shares', async () => {
    await expect(
      getShareByShortCode(createSupabaseMock({ shares: [{ data: null }] }).client, 'x')
    ).resolves.toEqual({ status: 'not_found' })

    const expired = { ...share, expires_at: '2026-10-01T00:00:00Z' }
    await expect(
      getShareByShortCode(createSupabaseMock({ shares: [{ data: expired }] }).client, 'x')
    ).resolves.toEqual({ status: 'expired', share: expired })
  })

  it('returns an empty stop list and no trip when they are missing', async () => {
    const mock = createSupabaseMock({
      shares: [{ data: share }],
      routes: [{ data: { id: 'r1' } }, { data: null }],
      route_stops: [{ data: null }],
    })
    const result = await getShareByShortCode(mock.client, 'abc12345')
    expect(result).toMatchObject({ status: 'ok', stops: [], trip: null })
  })

  it('throws on database errors', async () => {
    await expect(
      getShareByShortCode(
        createSupabaseMock({ shares: [{ error: { message: 'share error' } }] }).client,
        'x'
      )
    ).rejects.toThrow('share error')
    await expect(
      getShareByShortCode(
        createSupabaseMock({
          shares: [{ data: share }],
          routes: [{ error: { message: 'route error' } }],
        }).client,
        'x'
      )
    ).rejects.toThrow('route error')
    await expect(
      getShareByShortCode(
        createSupabaseMock({
          shares: [{ data: share }],
          routes: [{ data: { id: 'r1' } }],
          route_stops: [{ error: { message: 'stops error' } }],
        }).client,
        'x'
      )
    ).rejects.toThrow('stops error')
  })
})
