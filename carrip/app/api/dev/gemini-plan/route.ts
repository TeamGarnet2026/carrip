import { NextResponse } from 'next/server'
import { z } from 'zod'
import { devOnlyGuard } from '@/lib/dev/guard'
import { planRoutesWithGemini } from '@/lib/gemini/route-planner'
import { isGeminiConfigured } from '@/lib/google/config'
import { geocodeAddress, searchTouristSpots } from '@/lib/google/places'
import { selectPlacesNearDestination } from '@/lib/maps/route-corridor'
import { routeGenerateSchema } from '@/lib/routes/schema'

export async function POST(request: Request) {
  const blocked = devOnlyGuard()
  if (blocked) return blocked

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY が未設定です' },
      { status: 503 }
    )
  }

  try {
    const body = routeGenerateSchema.parse(await request.json())
    const places = (
      await Promise.all(
        body.prefecture.map((prefecture) =>
          searchTouristSpots(prefecture, body.preferences ?? [])
        )
      )
    ).flat()

    const destinations = (
      await Promise.all(body.prefecture.map((prefecture) => geocodeAddress(prefecture)))
    ).filter((point): point is { lat: number; lng: number } => point != null)

    const routePlaces = selectPlacesNearDestination(places, destinations)
    const plans = await planRoutesWithGemini(body, routePlaces)

    return NextResponse.json({
      candidate_count: routePlaces.length,
      plans,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Gemini ルート案生成に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
