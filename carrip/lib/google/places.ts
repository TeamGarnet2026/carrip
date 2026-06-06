import { getGoogleCloudApiKey } from '@/lib/google/config'
import {
  needsAdmissionDetailsFetch,
  parseAdmissionFeeFromPlace,
} from '@/lib/google/admission-fee'
import type { PoiPlace } from '@/lib/google/types'

const PREFERENCE_KEYWORDS: Record<string, string> = {
  scenic: '景観 自然',
  onsen: '温泉',
  gourmet: 'グルメ 名物',
  hidden: '穴場',
  view: '絶景 展望',
  experience: '体験',
}

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

export async function searchTouristSpots(
  prefecture: string,
  preferences: string[] = []
): Promise<PoiPlace[]> {
  const apiKey = getGoogleCloudApiKey()
  const prefKeywords = preferences
    .map((p) => PREFERENCE_KEYWORDS[p])
    .filter(Boolean)
    .join(' ')
  const textQuery = `${prefecture} 観光スポット ${prefKeywords}`.trim()

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
      body: JSON.stringify({
        textQuery,
        languageCode: 'ja',
        maxResultCount: 20,
      }),
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

  return filterQualityPlaces(places)
}

export async function searchTouristSpotsForPrefectures(
  prefectures: string[],
  preferences: string[] = []
): Promise<PoiPlace[]> {
  const results = await Promise.all(
    prefectures.map((prefecture) =>
      searchTouristSpots(prefecture, preferences)
    )
  )

  const seen = new Set<string>()
  const merged: PoiPlace[] = []

  for (const places of results) {
    for (const place of places) {
      if (seen.has(place.id)) continue
      seen.add(place.id)
      merged.push(place)
    }
  }

  return merged.slice(0, 20)
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = getGoogleCloudApiKey()

  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location',
      },
      body: JSON.stringify({
        textQuery: address,
        languageCode: 'ja',
        maxResultCount: 1,
      }),
    }
  )

  if (!response.ok) return null

  const data = (await response.json()) as PlacesSearchResponse
  const location = data.places?.[0]?.location
  if (location?.latitude == null || location?.longitude == null) return null

  return { lat: location.latitude, lng: location.longitude }
}

function normalizePlaceResourceName(placeId: string): string {
  return placeId.startsWith('places/') ? placeId : `places/${placeId}`
}

export async function fetchPlaceAdmissionFee(placeId: string): Promise<number> {
  const apiKey = getGoogleCloudApiKey()
  const resourceName = normalizePlaceResourceName(placeId)

  const response = await fetch(
    `https://places.googleapis.com/v1/${resourceName}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'priceRange,priceLevel',
      },
      next: { revalidate: 0 },
    }
  )

  if (!response.ok) return 0

  const data = (await response.json()) as {
    priceRange?: PoiPlace['priceRange']
    priceLevel?: string
  }

  return parseAdmissionFeeFromPlace({
    priceRange: data.priceRange,
    priceLevel: data.priceLevel,
  })
}

export async function resolveAdmissionFeesForStops(
  stops: PoiPlace[]
): Promise<number[]> {
  return Promise.all(
    stops.map(async (stop) => {
      if (!needsAdmissionDetailsFetch(stop)) {
        return parseAdmissionFeeFromPlace(stop)
      }

      return fetchPlaceAdmissionFee(stop.id)
    })
  )
}
