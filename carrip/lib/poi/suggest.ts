import {
  getCachedPlacesByPrefecture,
  setCachedPlacesByPrefecture,
} from '@/lib/cache/poi-cache'
import { searchTouristSpots } from '@/lib/google/places'
import { PlacesQuotaExceededError } from '@/lib/google/quota'
import type { PoiPlace } from '@/lib/google/types'
import { MIN_POI_SPACING_KM, thinNearbyPlaces } from '@/lib/maps/route-corridor'

/** 行き先候補一覧に出す上限 */
export const MAX_SUGGESTED_SPOTS = 10

/** 行き先候補として画面に返す形 */
export type SpotCandidate = {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  user_rating_count?: number
  category?: string
}

export function toSpotCandidate(
  place: PoiPlace,
  fallbackCategory = 'tourist'
): SpotCandidate {
  return {
    place_id: place.id,
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    rating: place.rating,
    user_rating_count: place.userRatingCount,
    category: place.category ?? fallbackCategory,
  }
}

export type SuggestResult = {
  places: PoiPlace[]
  /** Places API が使えず、一部またはすべての候補を取得できなかった */
  usedFallback: boolean
  /** Places API の利用上限に達していて、取得できなかった候補がある */
  quotaExceeded: boolean
}

async function suggestForPrefecture(
  prefecture: string,
  preferences: string[]
): Promise<SuggestResult> {
  const cached = await getCachedPlacesByPrefecture(prefecture, preferences)
  if (cached?.length) {
    return { places: cached, usedFallback: false, quotaExceeded: false }
  }

  try {
    const places = await searchTouristSpots(prefecture, preferences)
    if (places.length > 0) {
      await setCachedPlacesByPrefecture(prefecture, preferences, places)
      return { places, usedFallback: false, quotaExceeded: false }
    }
    return { places: [], usedFallback: false, quotaExceeded: false }
  } catch (error) {
    // 架空の代替地点は行き先として選ばせられないため、候補なしとして返す
    console.warn('Places API failed while suggesting spots:', error)
    return {
      places: [],
      usedFallback: true,
      quotaExceeded: error instanceof PlacesQuotaExceededError,
    }
  }
}

/** 都道府県ごとの人気観光スポットを行き先候補として返す */
export async function suggestTouristSpots(
  prefectures: string[],
  preferences: string[] = []
): Promise<SuggestResult> {
  const results = await Promise.all(
    prefectures.map((prefecture) => suggestForPrefecture(prefecture, preferences))
  )

  const seen = new Set<string>()
  const merged: PoiPlace[] = []
  for (const result of results) {
    for (const place of result.places) {
      if (seen.has(place.id)) continue
      seen.add(place.id)
      merged.push(place)
    }
  }

  return {
    places: thinNearbyPlaces(merged, MIN_POI_SPACING_KM).slice(
      0,
      MAX_SUGGESTED_SPOTS
    ),
    usedFallback: results.some((result) => result.usedFallback),
    quotaExceeded: results.some((result) => result.quotaExceeded),
  }
}
