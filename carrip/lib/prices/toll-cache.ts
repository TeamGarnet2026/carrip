import { getRedis, isRedisConfigured } from '@/lib/redis/client'
import type { TollPriceResult } from '@/lib/prices/toll'

const TOLL_CACHE_TTL_SECONDS = 60 * 60 * 24

const memoryCache = new Map<
  string,
  { value: TollPriceResult; expiresAt: number }
>()

export async function getCachedTollPrice(
  cacheKey: string
): Promise<TollPriceResult | null> {
  if (isRedisConfigured()) {
    return getRedis().get<TollPriceResult>(cacheKey)
  }

  const entry = memoryCache.get(cacheKey)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(cacheKey)
    return null
  }
  return entry.value
}

export async function setCachedTollPrice(
  cacheKey: string,
  value: TollPriceResult
): Promise<void> {
  if (isRedisConfigured()) {
    await getRedis().set(cacheKey, value, { ex: TOLL_CACHE_TTL_SECONDS })
    return
  }

  memoryCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + TOLL_CACHE_TTL_SECONDS * 1000,
  })
}
