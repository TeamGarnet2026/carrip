/** Google Maps Directions URL で指定できる中間地点の上限 */
export const GOOGLE_MAPS_MAX_WAYPOINTS = 9

export type GoogleMapsDirectionsStop = {
  lat: number
  lng: number
  name?: string
}

export type GoogleMapsDirectionsInput = {
  origin: string
  stops: GoogleMapsDirectionsStop[]
}

export type GoogleMapsDirectionsResult = {
  url: string
  waypointsTruncated: boolean
  totalStops: number
  includedStops: number
}

function formatCoordinate(stop: GoogleMapsDirectionsStop): string {
  return `${stop.lat},${stop.lng}`
}

function isValidStop(stop: GoogleMapsDirectionsStop): boolean {
  return (
    Number.isFinite(stop.lat) &&
    Number.isFinite(stop.lng) &&
    stop.lat >= -90 &&
    stop.lat <= 90 &&
    stop.lng >= -180 &&
    stop.lng <= 180
  )
}

export function buildGoogleMapsDirectionsUrl(
  input: GoogleMapsDirectionsInput
): GoogleMapsDirectionsResult | null {
  const origin = input.origin.trim()
  const stops = input.stops.filter(isValidStop)

  if (!origin || stops.length === 0) return null

  const destination = stops[stops.length - 1]
  const middleStops = stops.slice(0, -1)
  const waypointsTruncated = middleStops.length > GOOGLE_MAPS_MAX_WAYPOINTS
  const includedMiddle = middleStops.slice(0, GOOGLE_MAPS_MAX_WAYPOINTS)

  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin,
    destination: formatCoordinate(destination),
  })

  if (includedMiddle.length > 0) {
    params.set('waypoints', includedMiddle.map(formatCoordinate).join('|'))
  }

  const includedStops =
    includedMiddle.length + 1

  return {
    url: `https://www.google.com/maps/dir/?${params.toString()}`,
    waypointsTruncated,
    totalStops: stops.length,
    includedStops,
  }
}
