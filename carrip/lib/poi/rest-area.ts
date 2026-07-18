import type { PoiPlace } from '@/lib/google/types'
import { haversineKm, type LatLng } from '@/lib/maps/route-corridor'
import type { RouteSection } from '@/lib/routes/types'
import { searchPlacesByText } from '@/lib/poi/search'

export type DriverChangeCategory =
  | 'service_area'
  | 'parking_area'
  | 'rest_area'
  | 'convenience_store'

export type DriverChangeStop = PoiPlace & {
  category: DriverChangeCategory
}

const DRIVER_CHANGE_CATEGORIES = new Set<string>([
  'service_area',
  'parking_area',
  'rest_area',
  'convenience_store',
])

export type DriverChangeInsertion = {
  legIndex: number
  fraction: number
  insertIndex: number
}

export function isDriverChangeCategory(
  category?: string | null
): category is DriverChangeCategory {
  return category != null && DRIVER_CHANGE_CATEGORIES.has(category)
}

export function isTouristStop(stop: PoiPlace): boolean {
  return !isDriverChangeCategory(stop.category)
}

/** @deprecated planDriverChangeInsertions を使用 */
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

export function parseDriveLegDurations(
  sections: RouteSection[],
  waypoints: LatLng[]
): number[] {
  const legDurations: number[] = []
  let current = 0

  for (const section of sections) {
    if (section.type === 'move') {
      current += section.duration_min ?? 0
      continue
    }

    if (section.type === 'point') {
      legDurations.push(current)
      current = 0
    }
  }

  if (current > 0) {
    legDurations.push(current)
  }

  const expectedLegs = Math.max(waypoints.length - 1, 0)
  if (expectedLegs === 0) return []
  if (legDurations.length === expectedLegs) return legDurations

  const totalMoveMin = sections
    .filter((section) => section.type === 'move')
    .reduce((sum, section) => sum + (section.duration_min ?? 0), 0)

  return splitDurationByWaypointDistance(waypoints, totalMoveMin)
}

function splitDurationByWaypointDistance(
  waypoints: LatLng[],
  totalMin: number
): number[] {
  if (waypoints.length < 2) return []

  const distances = waypoints.slice(0, -1).map((from, index) => {
    const to = waypoints[index + 1]
    return haversineKm(from.lat, from.lng, to.lat, to.lng)
  })

  const totalDistance = distances.reduce((sum, distance) => sum + distance, 0)
  if (totalDistance <= 0) {
    const even = totalMin / distances.length
    return distances.map(() => even)
  }

  return distances.map((distance) => (distance / totalDistance) * totalMin)
}

export function interpolatePointOnLeg(
  from: LatLng,
  to: LatLng,
  fraction: number
): LatLng {
  const clamped = Math.max(0, Math.min(1, fraction))
  return {
    lat: from.lat + (to.lat - from.lat) * clamped,
    lng: from.lng + (to.lng - from.lng) * clamped,
  }
}

export function planDriverChangeInsertions(
  origin: LatLng,
  stops: LatLng[],
  sections: RouteSection[],
  maxDriveMin: number,
  roundTrip = false
): DriverChangeInsertion[] {
  if (maxDriveMin <= 0) return []

  const waypoints = roundTrip
    ? [origin, ...stops, origin]
    : [origin, ...stops]
  const legDurations = parseDriveLegDurations(sections, waypoints)
  const insertions: DriverChangeInsertion[] = []
  let insertionsBeforeLeg = 0

  for (let legIndex = 0; legIndex < legDurations.length; legIndex += 1) {
    const legMin = legDurations[legIndex]
    if (legMin <= maxDriveMin) continue

    const insertionCount = Math.floor(legMin / maxDriveMin)
    for (let index = 1; index <= insertionCount; index += 1) {
      const fraction = (index * maxDriveMin) / legMin
      if (fraction >= 1) continue

      insertions.push({
        legIndex,
        fraction,
        insertIndex: legIndex + index - 1 + insertionsBeforeLeg,
      })
    }

    insertionsBeforeLeg += insertionCount
  }

  return insertions
}

function pickNearestPlace(
  places: PoiPlace[],
  lat: number,
  lng: number
): PoiPlace | null {
  if (places.length === 0) return null

  return (
    [...places]
      .map((place) => ({
        place,
        distance: (place.lat - lat) ** 2 + (place.lng - lng) ** 2,
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.place ?? null
  )
}

async function findHighwayRestStop(
  lat: number,
  lng: number,
  preferParkingArea: boolean
): Promise<DriverChangeStop | null> {
  const bias = { lat, lng, radiusMeters: 40000 }
  const keyword = preferParkingArea ? 'パーキングエリア PA' : 'サービスエリア SA'
  const places = await searchPlacesByText(keyword, {
    maxResultCount: 8,
    skipQualityFilter: true,
    locationBias: bias,
  })

  const filtered = places.filter((place) => {
    const name = place.name
    if (preferParkingArea) {
      return /PA|パーキング|パーキングエリア/i.test(name)
    }
    return /SA|サービスエリア/i.test(name) && !/PA|パーキング/i.test(name)
  })

  const nearest = pickNearestPlace(
    filtered.length > 0 ? filtered : places,
    lat,
    lng
  )
  if (!nearest) return null

  const category: DriverChangeCategory = preferParkingArea
    ? 'parking_area'
    : /PA|パーキング/i.test(nearest.name)
      ? 'parking_area'
      : 'service_area'

  return { ...nearest, category }
}

async function findConvenienceStoreStop(
  lat: number,
  lng: number
): Promise<DriverChangeStop | null> {
  const places = await searchPlacesByText('コンビニ', {
    maxResultCount: 8,
    skipQualityFilter: true,
    locationBias: { lat, lng, radiusMeters: 20000 },
  })

  const filtered = places.filter((place) =>
    /コンビニ|ファミリーマート|ローソン|セブン|ミニストップ|デイリーヤマザキ/i.test(
      place.name
    )
  )

  const nearest = pickNearestPlace(
    filtered.length > 0 ? filtered : places,
    lat,
    lng
  )
  if (!nearest) return null

  return { ...nearest, category: 'convenience_store' }
}

async function findDriverChangeStopNear(
  lat: number,
  lng: number,
  useHighway: boolean,
  insertionIndex: number
): Promise<DriverChangeStop | null> {
  if (useHighway) {
    const preferParkingArea = insertionIndex % 2 === 1
    const highwayStop = await findHighwayRestStop(lat, lng, preferParkingArea)
    if (highwayStop) return highwayStop

    return findHighwayRestStop(lat, lng, !preferParkingArea)
  }

  return findConvenienceStoreStop(lat, lng)
}

export async function insertDriverChangeStops(
  stops: PoiPlace[],
  sections: RouteSection[],
  maxDriveMin: number,
  useHighway: boolean,
  origin: LatLng,
  roundTrip = false
): Promise<PoiPlace[]> {
  if (maxDriveMin <= 0) return stops

  const waypoints = roundTrip
    ? [origin, ...stops, origin]
    : [origin, ...stops]
  const planned = planDriverChangeInsertions(
    origin,
    stops,
    sections,
    maxDriveMin,
    roundTrip
  )
  if (planned.length === 0) return stops

  const result = [...stops]

  for (const [planIndex, plan] of planned.entries()) {
    const from = waypoints[plan.legIndex]
    const to = waypoints[plan.legIndex + 1]
    if (!from || !to) continue

    const point = interpolatePointOnLeg(from, to, plan.fraction)
    const restStop = await findDriverChangeStopNear(
      point.lat,
      point.lng,
      useHighway,
      planIndex
    )
    if (!restStop) continue

    const duplicate = result.some((stop) => stop.id === restStop.id)
    if (duplicate) continue

    result.splice(plan.insertIndex, 0, restStop)
  }

  return result
}

/** @deprecated insertDriverChangeStops を使用 */
export async function insertRestAreasIntoStops(
  stops: PoiPlace[],
  sections: RouteSection[],
  maxDriveMin: number
): Promise<PoiPlace[]> {
  if (stops.length === 0) {
    return insertDriverChangeStops(
      stops,
      sections,
      maxDriveMin,
      true,
      { lat: 0, lng: 0 }
    )
  }

  const origin = { lat: stops[0].lat, lng: stops[0].lng }
  return insertDriverChangeStops(stops, sections, maxDriveMin, true, origin)
}

export type RestAreaStop = DriverChangeStop
