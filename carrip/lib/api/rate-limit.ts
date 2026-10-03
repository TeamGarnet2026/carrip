import { NextResponse } from 'next/server'
import { getRedis, isRedisConfigured } from '@/lib/redis/client'

const memoryCounters = new Map<string, { count: number; resetAt: number }>()

export type RateLimitOptions = {
  /** 用途ごとの名前（キーの区別に使う） */
  name: string
  limit: number
  windowSeconds: number
}

export function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

async function incrementCounter(
  key: string,
  windowSeconds: number
): Promise<number> {
  if (isRedisConfigured()) {
    const redis = getRedis()
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }
    return count
  }

  const now = Date.now()
  const entry = memoryCounters.get(key)
  if (!entry || now > entry.resetAt) {
    memoryCounters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return 1
  }
  entry.count += 1
  return entry.count
}

/**
 * 上限を超えたら 429 レスポンスを返す。超えていなければ null。
 * Redis 障害時は利用者を止めないよう制限せずに通す。
 */
export async function enforceRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const window = Math.floor(Date.now() / 1000 / options.windowSeconds)
  const key = `ratelimit:${options.name}:${clientIdentifier(request)}:${window}`

  try {
    const count = await incrementCounter(key, options.windowSeconds)
    if (count <= options.limit) return null
  } catch (error) {
    console.warn('Rate limit check failed, allowing request:', error)
    return null
  }

  return NextResponse.json(
    { error: 'リクエストが多すぎます。少し時間をおいてから再度お試しください' },
    {
      status: 429,
      headers: { 'Retry-After': String(options.windowSeconds) },
    }
  )
}
