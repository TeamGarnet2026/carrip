import {
  ROUTE_CACHE_KEY_PREFIX,
  ROUTE_CACHE_TTL_SECONDS,
} from '@/lib/cache/constants'
import {
  getMemoryCachedRouteSearch,
  setMemoryCachedRouteSearch,
} from '@/lib/cache/memory-cache'
import { sha256Hex } from '@/lib/crypto/sha256'
import { getRedis, isRedisConfigured } from '@/lib/redis/client'
import type {
  RouteGenerateRequest,
  RouteSearchResult,
} from '@/lib/routes/types'

export type CacheBackend = 'redis' | 'memory'

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}

export function getCacheBackend(): CacheBackend | null {
  if (isRedisConfigured()) return 'redis'
  if (process.env.NODE_ENV === 'development') return 'memory'
  return null
}

export async function buildRouteCacheKey(
  request: RouteGenerateRequest
): Promise<string> {
  const hash = await sha256Hex(stableStringify(request))
  return `${ROUTE_CACHE_KEY_PREFIX}${hash}`
}

export function getRouteCacheTtlSeconds(): number {
  return ROUTE_CACHE_TTL_SECONDS
}

export async function getCachedRouteSearch(
  cacheKey: string
): Promise<RouteSearchResult | null> {
  const backend = getCacheBackend()
  if (backend === 'redis') {
    return getRedis().get<RouteSearchResult>(cacheKey)
  }
  if (backend === 'memory') {
    return getMemoryCachedRouteSearch(cacheKey)
  }
  return null
}

export async function setCachedRouteSearch(
  cacheKey: string,
  result: RouteSearchResult,
  ttlSeconds: number = ROUTE_CACHE_TTL_SECONDS
): Promise<void> {
  const backend = getCacheBackend()
  if (backend === 'redis') {
    await getRedis().set(cacheKey, result, { ex: ttlSeconds })
    return
  }
  if (backend === 'memory') {
    setMemoryCachedRouteSearch(cacheKey, result, ttlSeconds)
  }
}
