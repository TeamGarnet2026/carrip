import { getGoogleCloudApiKey } from '@/lib/google/config'
import type { PoiPlace } from '@/lib/google/types'

type PlacesSearchResponse = {
  places?: Array<{
    id?: string
    displayName?: { text?: string }
    formattedAddress?: string
    location?: { latitude?: number; longitude?: number }
    rating?: number
    userRatingCount?: number
    priceLevel?: string
    priceRange?: PoiPlace['priceRange']
  }>
}

function mapPlace(raw: NonNullable<PlacesSearchResponse['places']>[number]): PoiPlace | null {
  if (
    !raw.id ||
    !raw.displayName?.text ||
    raw.location?.latitude == null ||
    raw.location?.longitude == null
  ) {
    return null
  }

  return {
    id: raw.id,
    name: raw.displayName.text,
    address: raw.formattedAddress ?? raw.displayName.text,
    lat: raw.location.latitude,
    lng: raw.location.longitude,
    rating: raw.rating,
    userRatingCount: raw.userRatingCount,
    priceRange: raw.priceRange,
    priceLevel: raw.priceLevel,
  }
}

function filterQualityPlaces(places: PoiPlace[]): PoiPlace[] {
  return places
    .filter((place) => {
      if (place.rating != null && place.rating < 3.8) return false
      if (place.userRatingCount != null && place.userRatingCount < 20) return false
      return true
    })
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
}

export type PoiSearchOptions = {
  maxResultCount?: number
  skipQualityFilter?: boolean
  locationBias?: { lat: number; lng: number; radiusMeters?: number }
}

export async function searchPlacesByText(
  textQuery: string,
  options: PoiSearchOptions = {}
): Promise<PoiPlace[]> {
  const apiKey = getGoogleCloudApiKey()
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: 'ja',
    maxResultCount: options.maxResultCount ?? 10,
  }

  if (options.locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: options.locationBias.lat,
          longitude: options.locationBias.lng,
        },
        radius: options.locationBias.radiusMeters ?? 50000,
      },
    }
  }

  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceRange,places.priceLevel',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Places API エラー (${response.status}): ${detail}`)
  }

  const data = (await response.json()) as PlacesSearchResponse
  const places = (data.places ?? [])
    .map(mapPlace)
    .filter((place): place is PoiPlace => place !== null)

  return options.skipQualityFilter ? places : filterQualityPlaces(places)
}

export async function searchRestAreas(
  query: string,
  category: 'rest_area' | 'service_area' | 'all' = 'all'
): Promise<PoiPlace[]> {
  const keywords =
    category === 'service_area'
      ? ['サービスエリア', 'SA']
      : category === 'rest_area'
        ? ['道の駅']
        : ['道の駅', 'サービスエリア']

  const results = await Promise.all(
    keywords.map((keyword) =>
      searchPlacesByText(`${query} ${keyword}`.trim(), {
        maxResultCount: 10,
        skipQualityFilter: true,
      })
    )
  )

  const seen = new Set<string>()
  const merged: PoiPlace[] = []

  for (const places of results) {
    for (const place of places) {
      if (seen.has(place.id)) continue
      seen.add(place.id)
      const inferredCategory =
        place.name.includes('サービスエリア') || place.name.includes('SA')
          ? 'service_area'
          : place.name.includes('道の駅')
            ? 'rest_area'
            : 'tourist'
      merged.push({
        ...place,
        category: category === 'all' ? inferredCategory : category,
      })
    }
  }

  return merged.slice(0, 20)
}

export async function searchTouristPois(
  query: string,
  prefecture?: string
): Promise<PoiPlace[]> {
  const textQuery = prefecture
    ? `${prefecture} ${query} 観光`
    : `${query} 観光`
  return searchPlacesByText(textQuery, { maxResultCount: 20 })
}
