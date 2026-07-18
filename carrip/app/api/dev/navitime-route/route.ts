import { NextResponse } from 'next/server'
import { z } from 'zod'
import { devOnlyGuard } from '@/lib/dev/guard'
import { geocodeAddress } from '@/lib/google/places'
import { fetchNavitimeCarRouteWithFallback } from '@/lib/external/fallback'
import { routeGenerateSchema } from '@/lib/routes/schema'

const bodySchema = routeGenerateSchema.extend({
  stops: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        lat: z.number(),
        lng: z.number(),
        category: z.string().optional(),
      })
    )
    .min(1),
})

export async function POST(request: Request) {
  const blocked = devOnlyGuard()
  if (blocked) return blocked

  try {
    const body = bodySchema.parse(await request.json())
    const origin = await geocodeAddress(body.origin)

    if (!origin) {
      return NextResponse.json(
        { error: '出発地の位置情報を取得できませんでした' },
        { status: 400 }
      )
    }

    const navitime = await fetchNavitimeCarRouteWithFallback({
      request: body,
      routeId: 'dev-navitime-test',
      origin,
      stops: body.stops,
    })

    return NextResponse.json(navitime)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'NAVITIME ルート取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
