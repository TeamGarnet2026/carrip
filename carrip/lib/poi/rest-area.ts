import type { PoiPlace } from '@/lib/google/types'
import type { RouteSection } from '@/lib/routes/types'
import { searchPlacesByText } from '@/lib/poi/search'

export type RestAreaStop = PoiPlace & {
  category: 'rest_area' | 'service_area'
}

function isRestAreaCategory(category?: string | null): boolean {
  return category === 'rest_area' || category === 'service_area'
}

export function detectLongDriveSegmentIndexes(
  sections: RouteSection[],
  maxDriveMin: number
): number[] {
  const indexes: number[] = []

  sections.forEach((section, index) => {
    if (section.type !== 'move') return
    if ((section.duration_min ?? 0) > maxDriveMin) {
      indexes.push(index)
    }
  })

  return indexes
}

async function findRestAreaNear(
  lat: number,
  lng: number,
  category: 'rest_area' | 'service_area'
): Promise<RestAreaStop | null> {
  const keyword = category === 'service_area' ? 'サービスエリア' : '道の駅'
  const places = await searchPlacesByText(`${keyword}`, {
    maxResultCount: 5,
    skipQualityFilter: true,
  })

  if (places.length === 0) return null

  const nearest = places
    .map((place) => ({
      place,
      distance:
        (place.lat - lat) ** 2 + (place.lng - lng) ** 2,
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.place

  if (!nearest) return null

  return {
    ...nearest,
    category,
  }
}

export async function insertRestAreasIntoStops(
  stops: PoiPlace[],
  sections: RouteSection[],
  maxDriveMin: number
): Promise<PoiPlace[]> {
  if (maxDriveMin <= 0 || stops.length === 0) return stops

  const longSegments = detectLongDriveSegmentIndexes(sections, maxDriveMin)
  if (longSegments.length === 0) return stops

  const result = [...stops]
  let inserted = 0

  for (const segmentIndex of longSegments) {
    const stopIndex = Math.min(
      Math.max(segmentIndex - inserted, 0),
      result.length - 1
    )
    const anchor = result[stopIndex]
    if (!anchor) continue

    const category: 'service_area' | 'rest_area' =
      (segmentIndex + inserted) % 2 === 0 ? 'service_area' : 'rest_area'

    const restStop = await findRestAreaNear(anchor.lat, anchor.lng, category)
    if (!restStop) continue

    const duplicate = result.some(
      (stop) => stop.id === restStop.id || isRestAreaCategory(stop.category as string | undefined)
    )
    if (duplicate) continue

    result.splice(stopIndex + 1, 0, restStop)
    inserted += 1
  }

  return result
}
