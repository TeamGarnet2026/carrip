import { NextResponse } from 'next/server'
import {
  getCacheBackend,
  getRouteCacheTtlSeconds,
} from '@/lib/cache/route-cache'
import { isRedisConfigured, pingRedis } from '@/lib/redis/client'

export async function GET() {
  const cacheBackend = getCacheBackend()

  if (cacheBackend === 'memory') {
    return NextResponse.json({
      ok: true,
      backend: 'memory',
      message:
        '開発用インメモリキャッシュを使用中。本番同等の確認には Upstash を設定してください。',
      route_cache_ttl_seconds: getRouteCacheTtlSeconds(),
    })
  }

  if (!isRedisConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN が未設定です',
      },
      { status: 503 }
    )
  }

  try {
    const connected = await pingRedis()
    return NextResponse.json({
      ok: connected,
      backend: 'redis',
      route_cache_ttl_seconds: getRouteCacheTtlSeconds(),
    })
  } catch (error) {
    console.error('GET /api/health/redis failed:', error)
    return NextResponse.json(
      { ok: false, error: 'Redis への接続に失敗しました' },
      { status: 503 }
    )
  }
}
