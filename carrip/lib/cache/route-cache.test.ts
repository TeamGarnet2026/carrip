import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteSearchResult } from '@/lib/routes/types'

const redisMock = {
  get: vi.fn(),
  set: vi.fn(),
}
let redisConfigured = false

vi.mock('@/lib/redis/client', () => ({
  isRedisConfigured: () => redisConfigured,
  getRedis: () => redisMock,
}))

const {
  buildRouteCacheKey,
  getCacheBackend,
  getCachedRouteSearch,
  getRouteCacheTtlSeconds,
  setCachedRouteSearch,
} = await import('@/lib/cache/route-cache')
const { getMemoryCachedRouteSearch, setMemoryCachedRouteSearch } = await import(
  '@/lib/cache/memory-cache'
)

const result: RouteSearchResult = {
  routes: [],
  generated_at: '2026-10-10T00:00:00.000Z',
}

beforeEach(() => {
  redisConfigured = false
  redisMock.get.mockReset()
  redisMock.set.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('memory cache', () => {
  it('returns a stored value until it expires', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T00:00:00Z'))
    setMemoryCachedRouteSearch('k1', result, 60)
    expect(getMemoryCachedRouteSearch('k1')).toEqual(result)

    vi.setSystemTime(new Date('2026-10-10T00:01:01Z'))
    expect(getMemoryCachedRouteSearch('k1')).toBeNull()
    // 期限切れのエントリは削除される
    expect(getMemoryCachedRouteSearch('k1')).toBeNull()
  })

  it('returns null for unknown keys', () => {
    expect(getMemoryCachedRouteSearch('missing')).toBeNull()
  })
})

describe('getCacheBackend', () => {
  it('prefers redis when configured', () => {
    redisConfigured = true
    expect(getCacheBackend()).toBe('redis')
  })

  it('falls back to memory only in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(getCacheBackend()).toBe('memory')
    vi.stubEnv('NODE_ENV', 'production')
    expect(getCacheBackend()).toBeNull()
  })
})

describe('buildRouteCacheKey', () => {
  it('is stable regardless of key order', async () => {
    const a = await buildRouteCacheKey({ origin: '京都駅', days: 1, options: { a: 1, b: 2 } })
    const b = await buildRouteCacheKey({ options: { b: 2, a: 1 }, days: 1, origin: '京都駅' })
    expect(a).toBe(b)
    expect(a).toMatch(/^routes:search:[0-9a-f]{64}$/)
  })

  it('changes when the request changes', async () => {
    const a = await buildRouteCacheKey({ origin: '京都駅', stops: ['x', 'y'] })
    const b = await buildRouteCacheKey({ origin: '京都駅', stops: ['y', 'x'] })
    expect(a).not.toBe(b)
  })
})

describe('getCachedRouteSearch / setCachedRouteSearch', () => {
  it('reads and writes through redis with the TTL', async () => {
    redisConfigured = true
    redisMock.get.mockResolvedValue(result)

    await setCachedRouteSearch('key', result, 120)
    expect(redisMock.set).toHaveBeenCalledWith('key', result, { ex: 120 })
    await expect(getCachedRouteSearch('key')).resolves.toEqual(result)
  })

  it('treats redis failures as cache misses', async () => {
    redisConfigured = true
    redisMock.get.mockRejectedValue(new Error('down'))
    redisMock.set.mockRejectedValue(new Error('down'))

    await expect(getCachedRouteSearch('key')).resolves.toBeNull()
    await expect(setCachedRouteSearch('key', result)).resolves.toBeUndefined()
  })

  it('uses the in-memory cache in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    await setCachedRouteSearch('dev-key', result)
    await expect(getCachedRouteSearch('dev-key')).resolves.toEqual(result)
  })

  it('does nothing without a cache backend', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await setCachedRouteSearch('none', result)
    await expect(getCachedRouteSearch('none')).resolves.toBeNull()
    expect(redisMock.set).not.toHaveBeenCalled()
  })

  it('exposes the default TTL (7 days)', () => {
    expect(getRouteCacheTtlSeconds()).toBe(60 * 60 * 24 * 7)
  })
})
