import { NextResponse } from 'next/server'
import { z } from 'zod'
import { devOnlyGuard } from '@/lib/dev/guard'
import { geocodeAddress, searchTouristSpots } from '@/lib/google/places'
import {
  DESTINATION_RADIUS_KM,
  selectPlacesNearDestination,
} from '@/lib/maps/route-corridor'

const bodySchema = z.object({
  prefecture: z.array(z.string()).min(1).max(5),
  preferences: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
  const blocked = devOnlyGuard()
  if (blocked) return blocked

  try {
    const body = bodySchema.parse(await request.json())
    const allPlaces = (
      await Promise.all(
        body.prefecture.map((prefecture) =>
          searchTouristSpots(prefecture, body.preferences ?? [])
        )
      )
    ).flat()

    const destinations = (
      await Promise.all(body.prefecture.map((prefecture) => geocodeAddress(prefecture)))
    ).filter((point): point is { lat: number; lng: number } => point != null)

    const filtered = selectPlacesNearDestination(allPlaces, destinations)

    return NextResponse.json({
      prefecture: body.prefecture,
      destination_count: destinations.length,
      raw_count: allPlaces.length,
      filtered_count: filtered.length,
      radius_km: DESTINATION_RADIUS_KM,
      places: filtered,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '目的地周辺 POI 検索に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
