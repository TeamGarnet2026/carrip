import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  buildRouteCacheKey,
  getCacheBackend,
  getCachedRouteSearch,
  getRouteCacheTtlSeconds,
  setCachedRouteSearch,
} from '@/lib/cache/route-cache'
import {
  generateRoutes,
  isRouteGenerationConfigured,
} from '@/lib/routes/generate'
import { routeGenerateSchema } from '@/lib/routes/schema'

export const runtime = 'edge'

export async function POST(request: Request) {
  if (!isRouteGenerationConfigured()) {
    return NextResponse.json(
      {
        error:
          'GOOGLE_CLOUD_API_KEY と RAPIDAPI_KEY / RAPIDAPI_HOST を .env.local に設定してください。',
      },
      { status: 503 }
    )
  }

  const cacheBackend = getCacheBackend()
  if (!cacheBackend) {
    return NextResponse.json(
      {
        error:
          'Redis が未設定です。UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN を .env.local に設定してください。',
      },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const params = routeGenerateSchema.parse(body)
    const cacheKey = buildRouteCacheKey(params)
    const ttlSeconds = getRouteCacheTtlSeconds()

    const cached = await getCachedRouteSearch(cacheKey)
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
        cache_backend: cacheBackend,
        cache_key: cacheKey,
        cache_ttl_seconds: ttlSeconds,
      })
    }

    const result = await generateRoutes(params)
    await setCachedRouteSearch(cacheKey, result, ttlSeconds)

    return NextResponse.json({
      ...result,
      cached: false,
      cache_backend: cacheBackend,
      cache_key: cacheKey,
      cache_ttl_seconds: ttlSeconds,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: error.flatten() },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : 'ルート検索に失敗しました'

    console.error('POST /api/routes/generate failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
