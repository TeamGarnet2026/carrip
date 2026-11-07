import { NextResponse } from 'next/server'
import { ZodError, z } from 'zod'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { getCachedPoiSearch, setCachedPoiSearch } from '@/lib/cache/poi-cache'
import { isGoogleCloudConfigured } from '@/lib/google/config'
import { FREE_PLAN_ENDED_MESSAGE, PlacesQuotaExceededError } from '@/lib/google/quota'
import { toOriginCandidate } from '@/lib/poi/origin'
import { searchPlacesByText } from '@/lib/poi/search'

const originQuerySchema = z.object({
  q: z.string().min(1).max(100),
})

export async function GET(request: Request) {
  // 入力のたびに呼ばれるため、画面側の待ち時間とキャッシュに加えて回数も制限する
  const limited = await enforceRateLimit(request, {
    name: 'pois-origin',
    limit: 30,
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
    const query = originQuerySchema.parse({
      q: url.searchParams.get('q')?.trim() ?? '',
    })

    const cacheKey = `poi:origin:${query.q}`
    let places = await getCachedPoiSearch(cacheKey)
    if (!places) {
      places = await searchPlacesByText(query.q, {
        maxResultCount: 8,
        skipQualityFilter: true,
        regionCode: 'JP',
      })
      await setCachedPoiSearch(cacheKey, places)
    }

    return NextResponse.json({ places: places.map(toOriginCandidate) })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: error.flatten() },
        { status: 400 }
      )
    }

    if (error instanceof PlacesQuotaExceededError) {
      console.warn('GET /api/pois/origin: Places API quota exceeded')
      return NextResponse.json(
        { error: FREE_PLAN_ENDED_MESSAGE, code: 'quota_exceeded' },
        { status: 429 }
      )
    }

    console.error('GET /api/pois/origin failed:', error)
    return NextResponse.json(
      { error: '出発地の候補を取得できませんでした' },
      { status: 502 }
    )
  }
}
