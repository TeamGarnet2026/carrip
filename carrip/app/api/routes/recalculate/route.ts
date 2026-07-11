import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  recalculateRoute,
  recalculateRouteStub,
} from '@/lib/routes/recalculate'
import { routeRecalculateSchema } from '@/lib/routes/schema'
import { isRouteGenerationConfigured } from '@/lib/routes/generate'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const stubMode = searchParams.get('mode') === 'stub'

  try {
    const body = routeRecalculateSchema.parse(await request.json())

    if (stubMode) {
      const result = await recalculateRouteStub(body)
      return NextResponse.json({ ...result, mode: 'stub' })
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

    const result = await recalculateRoute(body)
    return NextResponse.json({ ...result, mode: 'live' })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: error.flatten() },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : 'ルートの再計算に失敗しました'
    console.error('POST /api/routes/recalculate failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
