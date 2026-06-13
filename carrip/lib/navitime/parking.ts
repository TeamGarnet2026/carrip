import { getGoogleCloudApiKey } from '@/lib/google/config'
import type { PoiPlace } from '@/lib/google/types'

/** 観光地のデフォルト駐車料金（円/時間） */
export const DEFAULT_PARKING_YEN_PER_HOUR = 300

/** 1 POI あたりのデフォルト滞在時間（分） */
export const DEFAULT_STAY_MINUTES = 60

/** 道の駅・SA は多くが無料 */
export const REST_AREA_PARKING_YEN_PER_HOUR = 0

export type ParkingStopInput = Pick<
  PoiPlace,
  'id' | 'name' | 'lat' | 'lng'
> & {
  category?: string | null
  stay_minutes?: number
}

export type ParkingFeeResult = {
  place_id: string
  name: string
  hourly_yen: number
  stay_minutes: number
  total_yen: number
  source: 'places' | 'category_default' | 'free'
}

type ParkingOptions = {
  freeParking?: boolean
  freeParkingLot?: boolean
  freeStreetParking?: boolean
  paidParking?: boolean
  paidParkingLot?: boolean
  paidStreetParking?: boolean
}

function normalizePlaceResourceName(placeId: string): string {
  return placeId.startsWith('places/') ? placeId : `places/${placeId}`
}

function hourlyRateFromParkingOptions(options: ParkingOptions | undefined): number | null {
  if (!options) return null
  if (
    options.freeParking ||
    options.freeParkingLot ||
    options.freeStreetParking
  ) {
    return 0
  }
  if (
    options.paidParking ||
    options.paidParkingLot ||
    options.paidStreetParking
  ) {
    return DEFAULT_PARKING_YEN_PER_HOUR
  }
  return null
}

function hourlyRateFromCategory(category?: string | null): number {
  if (category === 'rest_area' || category === 'service_area') {
    return REST_AREA_PARKING_YEN_PER_HOUR
  }
  return DEFAULT_PARKING_YEN_PER_HOUR
}

function calculateParkingTotal(hourlyYen: number, stayMinutes: number): number {
  if (hourlyYen <= 0 || stayMinutes <= 0) return 0
  const hours = Math.max(1, Math.ceil(stayMinutes / 60))
  return hourlyYen * hours
}

export async function fetchParkingOptionsFromPlace(
  placeId: string
): Promise<ParkingOptions | null> {
  const apiKey = getGoogleCloudApiKey()
  const resourceName = normalizePlaceResourceName(placeId)

  const response = await fetch(
    `https://places.googleapis.com/v1/${resourceName}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'parkingOptions',
      },
      next: { revalidate: 0 },
    }
  )

  if (!response.ok) return null

  const data = (await response.json()) as { parkingOptions?: ParkingOptions }
  return data.parkingOptions ?? null
}

export async function resolveParkingFeeForStop(
  stop: ParkingStopInput
): Promise<ParkingFeeResult> {
  const stayMinutes = stop.stay_minutes ?? DEFAULT_STAY_MINUTES

  if (
    stop.category === 'rest_area' ||
    stop.category === 'service_area'
  ) {
    return {
      place_id: stop.id,
      name: stop.name,
      hourly_yen: REST_AREA_PARKING_YEN_PER_HOUR,
      stay_minutes: stayMinutes,
      total_yen: 0,
      source: 'free',
    }
  }

  try {
    const parkingOptions = await fetchParkingOptionsFromPlace(stop.id)
    const fromPlaces = hourlyRateFromParkingOptions(parkingOptions ?? undefined)

    if (fromPlaces != null) {
      return {
        place_id: stop.id,
        name: stop.name,
        hourly_yen: fromPlaces,
        stay_minutes: stayMinutes,
        total_yen: calculateParkingTotal(fromPlaces, stayMinutes),
        source: fromPlaces === 0 ? 'free' : 'places',
      }
    }
  } catch (error) {
    console.warn(`Parking lookup failed for ${stop.name}:`, error)
  }

  const hourlyYen = hourlyRateFromCategory(stop.category)
  return {
    place_id: stop.id,
    name: stop.name,
    hourly_yen: hourlyYen,
    stay_minutes: stayMinutes,
    total_yen: calculateParkingTotal(hourlyYen, stayMinutes),
    source: 'category_default',
  }
}

export async function resolveParkingFeesForStops(
  stops: ParkingStopInput[]
): Promise<ParkingFeeResult[]> {
  return Promise.all(stops.map((stop) => resolveParkingFeeForStop(stop)))
}

export function sumParkingFees(results: ParkingFeeResult[]): number {
  return results.reduce((total, item) => total + item.total_yen, 0)
}

/**
 * RapidAPI 経由の NAVITIME には駐車料金 API がないため、
 * Places の parkingOptions とカテゴリ別デフォルト単価で算出する。
 * NAVITIME API 2.0 の駐車料金 API が利用可能になったら差し替え可能。
 */
export function estimateParkingFallback(
  stopCount: number,
  stayMinutes: number = DEFAULT_STAY_MINUTES
): number {
  const hourlyYen = DEFAULT_PARKING_YEN_PER_HOUR
  return stopCount * calculateParkingTotal(hourlyYen, stayMinutes)
}
