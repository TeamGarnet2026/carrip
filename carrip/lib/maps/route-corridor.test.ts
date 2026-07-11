import { describe, expect, it } from 'vitest'
import {
  DESTINATION_RADIUS_KM,
  filterPlacesNearDestinations,
  filterPlacesNearCorridor,
  filterStopsNearPolyline,
  haversineKm,
  minDistanceToCorridorKm,
  orderStopsFromOrigin,
  orderStopsTowardDestination,
  progressTowardDestination,
  selectPlacesNearCorridor,
  selectPlacesNearDestination,
  thinNearbyPlaces,
} from '@/lib/maps/route-corridor'

describe('route-corridor', () => {
  const origin = { lat: 35.0116, lng: 135.7681 } // 京都
  const destination = { lat: 35.1815, lng: 136.9066 } // 名古屋
  const corridor = [origin, destination]

  it('measures haversine distance', () => {
    const distance = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng)
    expect(distance).toBeGreaterThan(100)
    expect(distance).toBeLessThan(140)
  })

  it('filters places far from corridor', () => {
    const places = [
      { lat: 35.15, lng: 136.2, rating: 4.5, name: 'near' },
      { lat: 34.0, lng: 134.0, rating: 4.8, name: 'far' },
    ]

    const filtered = filterPlacesNearCorridor(places, corridor, 40)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('near')
  })

  it('thins nearby places by rating', () => {
    const places = [
      { lat: 35.15, lng: 136.2, rating: 4.9 },
      { lat: 35.1501, lng: 136.2001, rating: 4.0 },
      { lat: 35.3, lng: 136.5, rating: 4.2 },
    ]

    const thinned = thinNearbyPlaces(places, 0.5)
    expect(thinned).toHaveLength(2)
    expect(thinned[0].rating).toBe(4.9)
  })

  it('orders stops from origin greedily', () => {
    const stops = [
      { lat: 35.18, lng: 136.9 },
      { lat: 35.12, lng: 136.1 },
    ]

    const ordered = orderStopsFromOrigin(origin, stops)
    expect(ordered[0].lat).toBe(35.12)
  })

  it('orders stops toward destination without backtracking', () => {
    const nagoyaDestination = { lat: 34.68, lng: 136.9 }
    const stops = [
      { name: 'deep', lat: 34.65, lng: 136.92 },
      { name: 'entry', lat: 34.72, lng: 136.88 },
      { name: 'backtrack', lat: 34.71, lng: 136.75 },
    ]

    const ordered = orderStopsTowardDestination(origin, nagoyaDestination, stops)
    const progresses = ordered.map((stop) =>
      progressTowardDestination(stop, origin, nagoyaDestination)
    )

    for (let i = 1; i < progresses.length; i += 1) {
      expect(progresses[i]).toBeGreaterThanOrEqual(progresses[i - 1] - 1e-6)
    }

    expect(ordered[ordered.length - 1].name).toBe('deep')
    expect(ordered.map((stop) => stop.name)).not.toEqual([
      'entry',
      'deep',
      'backtrack',
    ])
  })

  it('filters stops far from polyline', () => {
    const polyline = [
      { lat: 35.0, lng: 135.8 },
      { lat: 35.1, lng: 136.0 },
      { lat: 35.2, lng: 136.2 },
    ]
    const stops = [
      { lat: 35.05, lng: 135.9 },
      { lat: 34.0, lng: 134.0 },
    ]

    expect(filterStopsNearPolyline(stops, polyline, 25)).toHaveLength(1)
  })

  it('selectPlacesNearCorridor keeps at least corridor-near candidates', () => {
    const places = [
      { lat: 35.15, lng: 136.2, rating: 4.5 },
      { lat: 35.16, lng: 136.25, rating: 4.4 },
      { lat: 35.17, lng: 136.3, rating: 4.3 },
      { lat: 34.0, lng: 134.0, rating: 5.0 },
    ]

    const selected = selectPlacesNearCorridor(places, corridor)
    expect(selected.every((p) => minDistanceToCorridorKm(p, corridor) <= 60)).toBe(true)
    expect(selected.some((p) => p.rating === 5.0)).toBe(false)
  })

  it('filters places near destination only', () => {
    const places = [
      { lat: 35.011, lng: 135.768, rating: 4.8, name: 'near-kyoto' },
      { lat: 35.15, lng: 136.2, rating: 4.5, name: 'mid-route' },
      { lat: 34.0, lng: 134.0, rating: 5.0, name: 'far-away' },
    ]

    const filtered = filterPlacesNearDestinations(places, [origin], DESTINATION_RADIUS_KM)
    expect(filtered.map((place) => place.name)).toEqual(['near-kyoto'])
  })

  it('selectPlacesNearDestination thins and excludes far places', () => {
    const places = [
      { lat: 35.011, lng: 135.768, rating: 4.8 },
      { lat: 35.012, lng: 135.769, rating: 4.0 },
      { lat: 35.013, lng: 135.77, rating: 4.1 },
      { lat: 34.0, lng: 134.0, rating: 5.0 },
    ]

    const selected = selectPlacesNearDestination(places, [origin])
    expect(selected.every((place) => place.rating !== 5.0)).toBe(true)
    expect(selected.length).toBeGreaterThan(0)
  })
})
