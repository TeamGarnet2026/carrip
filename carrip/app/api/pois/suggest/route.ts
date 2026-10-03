import { NextResponse } from 'next/server'
import { ZodError, z } from 'zod'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { isGoogleCloudConfigured } from '@/lib/google/config'
import { suggestTouristSpots, toSpotCandidate } from '@/lib/poi/suggest'

const suggestQuerySchema = z.object({
  prefecture: z.array(z.string().min(1)).min(1).max(5),
  preferences: z.array(z.string().min(1)).max(10),
})

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, {
    name: 'pois-suggest',
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
    const query = suggestQuerySchema.parse({
      prefecture: url.searchParams.getAll('prefecture'),
      preferences: url.searchParams.getAll('preference'),
    })

    const result = await suggestTouristSpots(
      query.prefecture,
      query.preferences
    )

    return NextResponse.json({
      count: result.places.length,
      places: result.places.map((place) => toSpotCandidate(place)),
      degraded: result.usedFallback,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: error.flatten() },
        { status: 400 }
      )
    }

    console.error('GET /api/pois/suggest failed:', error)
    return NextResponse.json(
      { error: '行き先候補の取得に失敗しました' },
      { status: 502 }
    )
  }
}
