import { afterEach, describe, expect, it, vi } from 'vitest'

const ping = vi.fn()
const constructed: unknown[] = []

vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor(options: unknown) {
      constructed.push(options)
    }
    ping = ping
  },
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  constructed.length = 0
  ping.mockReset()
})

async function loadClient() {
  return import('@/lib/redis/client')
}

describe('redis client', () => {
  it('is configured only when both URL and token are set', async () => {
    const { isRedisConfigured } = await loadClient()
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    expect(isRedisConfigured()).toBe(false)
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token')
    expect(isRedisConfigured()).toBe(true)
  })

  it('throws when not configured', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const { getRedis } = await loadClient()
    expect(() => getRedis()).toThrow('UPSTASH_REDIS_REST_URL')
  })

  it('creates a single client with short retries and pings it', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token')
    const { getRedis, pingRedis } = await loadClient()

    expect(getRedis()).toBe(getRedis())
    expect(constructed).toHaveLength(1)
    expect(constructed[0]).toMatchObject({
      url: 'https://example.upstash.io',
      token: 'token',
      retry: { retries: 1 },
    })

    ping.mockResolvedValueOnce('PONG').mockResolvedValueOnce('NG')
    await expect(pingRedis()).resolves.toBe(true)
    await expect(pingRedis()).resolves.toBe(false)
  })
})
