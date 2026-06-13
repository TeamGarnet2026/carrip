import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  getCachedTollPrice,
  setCachedTollPrice,
} from '@/lib/prices/toll-cache'

export const runtime = 'edge'
import { isNavitimeConfigured } from '@/lib/navitime/config'
import { tollPriceQuerySchema } from '@/lib/prices/schema'
import { buildTollCacheKey, queryTollPrice } from '@/lib/prices/toll'

function parseLatLng(value: string | null, label: string) {
  if (!value) {
    throw new Error(`${label} は lat,lng 形式で指定してください`)
  }

  const [latRaw, lngRaw] = value.split(',')
  const lat = Number(latRaw)
  const lng = Number(lngRaw)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`${label} は lat,lng 形式で指定してください`)
  }

  return { lat, lng }
}

function parseViaList(value: string | null) {
  if (!value) return undefined

  return value.split('|').map((segment, index) => {
    const [latRaw, lngRaw] = segment.split(',')
    const lat = Number(latRaw)
    const lng = Number(lngRaw)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`via[${index}] は lat,lng 形式で指定してください`)
    }
    return { lat, lng }
  })
}

export async function GET(request: Request) {
  if (!isNavitimeConfigured()) {
    return NextResponse.json(
      { error: 'RAPIDAPI_KEY / RAPIDAPI_HOST が未設定です' },
      { status: 503 }
    )
  }

  try {
    const url = new URL(request.url)
    const query = tollPriceQuerySchema.parse({
      start: parseLatLng(url.searchParams.get('start'), 'start'),
      goal: parseLatLng(url.searchParams.get('goal'), 'goal'),
      via: parseViaList(url.searchParams.get('via')),
      vehicle_type: url.searchParams.get('vehicle_type') ?? 'compact',
      use_highway: url.searchParams.get('use_highway') ?? true,
      etc_card: url.searchParams.get('etc_card') ?? true,
      departure_date: url.searchParams.get('departure_date') ?? undefined,
      departure_time: url.searchParams.get('departure_time') ?? undefined,
    })

    const cacheKey = buildTollCacheKey(query)
    const cached = await getCachedTollPrice(cacheKey)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }

    const result = await queryTollPrice(query)
    await setCachedTollPrice(cacheKey, result)

    return NextResponse.json({ ...result, cached: false })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: error.flatten() },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : '高速料金の取得に失敗しました'
    console.error('GET /api/prices/toll failed:', error)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
