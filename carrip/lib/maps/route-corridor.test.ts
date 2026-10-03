import { describe, expect, it } from 'vitest'
import {
  DESTINATION_RADIUS_KM,
  filterPlacesNearDestinations,
  haversineKm,
  orderStopsFromOrigin,
  selectPlacesNearDestination,
  thinNearbyPlaces,
} from '@/lib/maps/route-corridor'

describe('route-corridor', () => {
  const origin = { lat: 35.0116, lng: 135.7681 } // 京都
  const destination = { lat: 35.1815, lng: 136.9066 } // 名古屋

  it('measures haversine distance', () => {
    const distance = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng)
    expect(distance).toBeGreaterThan(100)
    expect(distance).toBeLessThan(140)
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
