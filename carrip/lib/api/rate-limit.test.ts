import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = {
  incr: vi.fn(),
  expire: vi.fn(),
}
let redisConfigured = false

vi.mock('@/lib/redis/client', () => ({
  isRedisConfigured: () => redisConfigured,
  getRedis: () => redisMock,
}))

const { clientIdentifier, enforceRateLimit } = await import('@/lib/api/rate-limit')

function request(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/routes/build', { headers })
}

beforeEach(() => {
  redisConfigured = false
  redisMock.incr.mockReset()
  redisMock.expire.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('clientIdentifier', () => {
  it('uses the first x-forwarded-for address', () => {
    expect(clientIdentifier(request({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }))).toBe(
      '1.1.1.1'
    )
  })

  it('falls back to x-real-ip and then "unknown"', () => {
    expect(clientIdentifier(request({ 'x-real-ip': '3.3.3.3' }))).toBe('3.3.3.3')
    expect(clientIdentifier(request())).toBe('unknown')
  })
})

describe('enforceRateLimit（メモリ）', () => {
  it('allows requests up to the limit and returns 429 after that', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T00:00:00Z'))
    const options = { name: 'test-memory', limit: 2, windowSeconds: 60 }
    const req = () => request({ 'x-forwarded-for': '10.0.0.1' })

    await expect(enforceRateLimit(req(), options)).resolves.toBeNull()
    await expect(enforceRateLimit(req(), options)).resolves.toBeNull()

    const blocked = await enforceRateLimit(req(), options)
    expect(blocked?.status).toBe(429)
    expect(blocked?.headers.get('Retry-After')).toBe('60')
    await expect(blocked?.json()).resolves.toHaveProperty('error')
  })

  it('counts each client and each window separately', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T00:00:00Z'))
    const options = { name: 'test-window', limit: 1, windowSeconds: 60 }

    await enforceRateLimit(request({ 'x-forwarded-for': '10.0.0.2' }), options)
    await expect(
      enforceRateLimit(request({ 'x-forwarded-for': '10.0.0.3' }), options)
    ).resolves.toBeNull()

    // 次の時間枠ではリセットされる
    vi.setSystemTime(new Date('2026-10-10T00:01:00Z'))
    await expect(
      enforceRateLimit(request({ 'x-forwarded-for': '10.0.0.2' }), options)
    ).resolves.toBeNull()
  })
})

describe('enforceRateLimit（Redis）', () => {
  it('sets the expiry on the first hit only', async () => {
    redisConfigured = true
    redisMock.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    const options = { name: 'test-redis', limit: 5, windowSeconds: 30 }

    await enforceRateLimit(request(), options)
    await enforceRateLimit(request(), options)

    expect(redisMock.expire).toHaveBeenCalledTimes(1)
    expect(redisMock.expire.mock.calls[0][1]).toBe(30)
  })

  it('blocks when the redis counter exceeds the limit', async () => {
    redisConfigured = true
    redisMock.incr.mockResolvedValue(11)
    const blocked = await enforceRateLimit(request(), {
      name: 'test-redis-block',
      limit: 10,
      windowSeconds: 60,
    })
    expect(blocked?.status).toBe(429)
  })

  it('lets requests through when redis fails', async () => {
    redisConfigured = true
    redisMock.incr.mockRejectedValue(new Error('down'))
    await expect(
      enforceRateLimit(request(), { name: 'test-redis-down', limit: 1, windowSeconds: 60 })
    ).resolves.toBeNull()
  })
})
