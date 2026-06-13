import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuthUser } from '@/lib/api/auth'
import { isGoogleCloudConfigured } from '@/lib/google/config'
import {
  searchRestAreas,
  searchTouristPois,
} from '@/lib/poi/search'
import { poiSearchQuerySchema } from '@/lib/trips/schema'

export async function GET(request: Request) {
  const auth = await requireAuthUser()
  if (auth.response) return auth.response

  if (!isGoogleCloudConfigured()) {
    return NextResponse.json(
      { error: 'GOOGLE_CLOUD_API_KEY が未設定です' },
      { status: 503 }
    )
  }

  try {
    const url = new URL(request.url)
    const query = poiSearchQuerySchema.parse({
      q: url.searchParams.get('q') ?? '',
      category: url.searchParams.get('category') ?? 'all',
      prefecture: url.searchParams.get('prefecture') ?? undefined,
    })

    let places
    if (query.category === 'rest_area') {
      places = await searchRestAreas(query.q, 'rest_area')
    } else if (query.category === 'service_area') {
      places = await searchRestAreas(query.q, 'service_area')
    } else if (query.category === 'tourist') {
      places = await searchTouristPois(query.q, query.prefecture)
    } else {
      const [tourist, restAreas] = await Promise.all([
        searchTouristPois(query.q, query.prefecture),
        searchRestAreas(query.q, 'all'),
      ])
      const seen = new Set<string>()
      places = []
      for (const place of [...tourist, ...restAreas]) {
        if (seen.has(place.id)) continue
        seen.add(place.id)
        places.push(place)
      }
    }

    return NextResponse.json({
      query,
      count: places.length,
      places: places.map((place) => ({
        place_id: place.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        category: place.category ?? query.category,
      })),
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: error.flatten() },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : 'POI 検索に失敗しました'
    console.error('GET /api/pois/search failed:', error)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
