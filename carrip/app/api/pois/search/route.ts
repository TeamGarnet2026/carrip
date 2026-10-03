import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { getCachedPoiSearch, setCachedPoiSearch } from '@/lib/cache/poi-cache'
import { isGoogleCloudConfigured } from '@/lib/google/config'
import type { PoiPlace } from '@/lib/google/types'
import {
  searchRestAreas,
  searchTouristPois,
} from '@/lib/poi/search'
import { toSpotCandidate } from '@/lib/poi/suggest'
import { poiSearchQuerySchema, type PoiSearchQuery } from '@/lib/trips/schema'

async function searchPlaces(query: PoiSearchQuery): Promise<PoiPlace[]> {
  if (query.category === 'rest_area') {
    return searchRestAreas(query.q, 'rest_area')
  }
  if (query.category === 'service_area') {
    return searchRestAreas(query.q, 'service_area')
  }
  if (query.category === 'tourist') {
    return searchTouristPois(query.q, query.prefecture)
  }

  const [tourist, restAreas] = await Promise.all([
    searchTouristPois(query.q, query.prefecture),
    searchRestAreas(query.q, 'all'),
  ])
  const seen = new Set<string>()
  const places: PoiPlace[] = []
  for (const place of [...tourist, ...restAreas]) {
    if (seen.has(place.id)) continue
    seen.add(place.id)
    places.push(place)
  }
  return places
}

export async function GET(request: Request) {
  // ログイン不要で使えるため、Google Places の利用料を回数制限とキャッシュで抑える
  const limited = await enforceRateLimit(request, {
    name: 'pois-search',
    limit: 20,
    windowSeconds: 60,
  })
  if (limited) return limited

  if (!isGoogleCloudConfigured()) {
    return NextResponse.json(
      { error: 'GOOGLE_CLOUD_API_KEY が未設定です' },
      { status: 503 }
    )
  }

  try {
    const url = new URL(request.url)
    const query = poiSearchQuerySchema.parse({
      q: url.searchParams.get('q')?.trim() ?? '',
      category: url.searchParams.get('category') ?? 'all',
      prefecture: url.searchParams.get('prefecture') ?? undefined,
    })

    const cacheKey = `poi:text:${query.category}:${query.prefecture ?? ''}:${query.q}`
    let places = await getCachedPoiSearch(cacheKey)
    if (!places) {
      places = await searchPlaces(query)
      await setCachedPoiSearch(cacheKey, places)
    }

    return NextResponse.json({
      query,
      count: places.length,
      places: places.map((place) => toSpotCandidate(place, query.category)),
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: error.flatten() },
        { status: 400 }
      )
    }

    console.error('GET /api/pois/search failed:', error)
    return NextResponse.json(
      { error: '場所の検索に失敗しました' },
      { status: 502 }
    )
  }
}
