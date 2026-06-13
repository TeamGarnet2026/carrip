import { ROUTE_CACHE_TTL_SECONDS } from '@/lib/cache/constants'
import { getRedis, isRedisConfigured } from '@/lib/redis/client'
import type { PoiPlace } from '@/lib/google/types'

const POI_CACHE_KEY_PREFIX = 'poi:search:'

const memoryCache = new Map<
  string,
  { value: PoiPlace[]; expiresAt: number }
>()

function buildCacheKey(prefectures: string[], preferences: string[]): string {
  return `${POI_CACHE_KEY_PREFIX}${prefectures.sort().join('|')}::${preferences.sort().join('|')}`
}

export function getPoiCacheKey(
  prefectures: string[],
  preferences: string[] = []
): string {
  return buildCacheKey(prefectures, preferences)
}

export async function getCachedPoiSearch(
  cacheKey: string
): Promise<PoiPlace[] | null> {
  if (isRedisConfigured()) {
    return getRedis().get<PoiPlace[]>(cacheKey)
  }

  const entry = memoryCache.get(cacheKey)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(cacheKey)
    return null
  }
  return entry.value
}

export async function setCachedPoiSearch(
  cacheKey: string,
  places: PoiPlace[]
): Promise<void> {
  if (isRedisConfigured()) {
    await getRedis().set(cacheKey, places, { ex: ROUTE_CACHE_TTL_SECONDS })
    return
  }

  memoryCache.set(cacheKey, {
    value: places,
    expiresAt: Date.now() + ROUTE_CACHE_TTL_SECONDS * 1000,
  })
}

export async function getCachedPlacesByPrefecture(
  prefecture: string,
  preferences: string[] = []
): Promise<PoiPlace[] | null> {
  return getCachedPoiSearch(getPoiCacheKey([prefecture], preferences))
}

export async function setCachedPlacesByPrefecture(
  prefecture: string,
  preferences: string[],
  places: PoiPlace[]
): Promise<void> {
  await setCachedPoiSearch(getPoiCacheKey([prefecture], preferences), places)
}
