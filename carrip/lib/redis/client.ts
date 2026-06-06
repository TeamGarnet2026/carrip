import { Redis } from '@upstash/redis'

let redis: Redis | null = null

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  )
}

export function getRedis(): Redis {
  if (!isRedisConfigured()) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN が未設定です'
    )
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }

  return redis
}

export async function pingRedis(): Promise<boolean> {
  const result = await getRedis().ping()
  return result === 'PONG'
}
