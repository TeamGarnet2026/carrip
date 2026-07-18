import { NextResponse } from 'next/server'
import { z } from 'zod'
import { devOnlyGuard } from '@/lib/dev/guard'
import { insertDriverChangeStops } from '@/lib/poi/rest-area'
import type { RouteSection } from '@/lib/routes/types'

const stopSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  category: z.string().optional(),
})

const bodySchema = z.object({
  origin: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  stops: z.array(stopSchema).min(1),
  sections: z.array(
    z.object({
      type: z.string(),
      name: z.string(),
      distance_km: z.number().optional(),
      duration_min: z.number().optional(),
    })
  ),
  max_drive_min: z.number().int().min(30).max(240).default(120),
  use_highway: z.boolean().default(true),
})

export async function POST(request: Request) {
  const blocked = devOnlyGuard()
  if (blocked) return blocked

  try {
    const body = bodySchema.parse(await request.json())
    const stops = body.stops.map((stop) => ({
      ...stop,
      address: stop.address ?? stop.name,
    }))

    const origin = body.origin ?? {
      lat: stops[0].lat + 0.2,
      lng: stops[0].lng - 0.2,
    }

    const updated = await insertDriverChangeStops(
      stops,
      body.sections as RouteSection[],
      body.max_drive_min,
      body.use_highway,
      origin
    )

    return NextResponse.json({
      before_count: stops.length,
      after_count: updated.length,
      inserted_count: updated.length - stops.length,
      use_highway: body.use_highway,
      stop_type: body.use_highway ? 'SA/PA' : 'コンビニ',
      stops: updated,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '運転交代地点の挿入テストに失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
