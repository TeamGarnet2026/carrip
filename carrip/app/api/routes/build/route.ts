import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  buildRouteCacheKey,
  getCacheBackend,
  getCachedRouteSearch,
  getRouteCacheTtlSeconds,
  setCachedRouteSearch,
} from '@/lib/cache/route-cache'
import { buildRoutes, isRouteGenerationConfigured } from '@/lib/routes/build'
import { buildRoutesStub } from '@/lib/routes/build-stub'
import { routeBuildSchema } from '@/lib/routes/schema'

function errorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: '入力内容に誤りがあります', details: error.flatten() },
      { status: 400 }
    )
  }

  const message = error instanceof Error ? error.message : fallbackMessage
  console.error('POST /api/routes/build failed:', error)
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)

  if (searchParams.get('mode') === 'stub') {
    try {
      const params = routeBuildSchema.parse(await request.json())
      return NextResponse.json({
        ...buildRoutesStub(params),
        cached: false,
        mode: 'stub',
        cache_key: 'stub',
        cache_ttl_seconds: 0,
      })
    } catch (error) {
      return errorResponse(error, 'スタブ生成に失敗しました')
    }
  }

  if (!isRouteGenerationConfigured()) {
    return NextResponse.json(
      {
        error:
          'GOOGLE_CLOUD_API_KEY と RAPIDAPI_KEY / RAPIDAPI_HOST を .env.local に設定してください。',
      },
      { status: 503 }
    )
  }

  try {
    const params = routeBuildSchema.parse(await request.json())
    const cacheBackend = getCacheBackend()
    const cacheKey = await buildRouteCacheKey({ kind: 'build', ...params })
    const ttlSeconds = getRouteCacheTtlSeconds()

    const cached = cacheBackend ? await getCachedRouteSearch(cacheKey) : null
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
        cache_backend: cacheBackend ?? undefined,
        cache_key: cacheKey,
        cache_ttl_seconds: ttlSeconds,
      })
    }

    const result = await buildRoutes(params)
    if (cacheBackend) {
      await setCachedRouteSearch(cacheKey, result, ttlSeconds)
    }

    return NextResponse.json({
      ...result,
      cached: false,
      cache_backend: cacheBackend ?? undefined,
      cache_key: cacheKey,
      cache_ttl_seconds: ttlSeconds,
    })
  } catch (error) {
    return errorResponse(error, 'ルートの作成に失敗しました')
  }
}
