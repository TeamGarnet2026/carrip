import type { RouteSearchResult } from '@/lib/routes/types'

type MemoryEntry = {
  value: RouteSearchResult
  expiresAt: number
}

const store = new Map<string, MemoryEntry>()

export function getMemoryCachedRouteSearch(
  cacheKey: string
): RouteSearchResult | null {
  const entry = store.get(cacheKey)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    store.delete(cacheKey)
    return null
  }

  return entry.value
}

export function setMemoryCachedRouteSearch(
  cacheKey: string,
  result: RouteSearchResult,
  ttlSeconds: number
): void {
  store.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}
