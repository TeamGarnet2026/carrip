import { describe, expect, it } from 'vitest'
import { buildGoogleMapsDirectionsUrl } from '@/lib/maps/google-maps-directions-url'

describe('buildGoogleMapsDirectionsUrl', () => {
  it('builds a directions URL with origin, destination, and waypoints', () => {
    const result = buildGoogleMapsDirectionsUrl({
      origin: '京都駅',
      stops: [
        { lat: 34.9949, lng: 135.785, name: '清水寺' },
        { lat: 35.0394, lng: 135.7292, name: '金閣寺' },
      ],
    })

    expect(result).not.toBeNull()
    expect(result!.url).toContain('https://www.google.com/maps/dir/?')
    expect(result!.url).toContain('api=1')
    expect(result!.url).toContain('travelmode=driving')
    expect(result!.url).toContain(encodeURIComponent('京都駅'))
    expect(result!.url).toContain('34.9949%2C135.785')
    expect(result!.url).toContain('35.0394%2C135.7292')
    expect(result!.waypointsTruncated).toBe(false)
    expect(result!.includedStops).toBe(2)
  })

  it('uses a single stop as destination without waypoints', () => {
    const result = buildGoogleMapsDirectionsUrl({
      origin: '名古屋駅',
      stops: [{ lat: 35.0116, lng: 135.7681 }],
    })

    expect(result).not.toBeNull()
    expect(result!.url).not.toContain('waypoints=')
    expect(result!.includedStops).toBe(1)
  })

  it('truncates middle stops when exceeding Google Maps waypoint limit', () => {
    const stops = Array.from({ length: 12 }, (_, index) => ({
      lat: 35 + index * 0.01,
      lng: 135.7 + index * 0.01,
    }))

    const result = buildGoogleMapsDirectionsUrl({
      origin: '東京駅',
      stops,
    })

    expect(result).not.toBeNull()
    expect(result!.waypointsTruncated).toBe(true)
    expect(result!.totalStops).toBe(12)
    expect(result!.includedStops).toBe(10)
    const params = new URL(result!.url).searchParams
    expect(params.get('waypoints')?.split('|').length).toBe(9)
  })

  it('returns null when origin or stops are missing', () => {
    expect(
      buildGoogleMapsDirectionsUrl({ origin: '', stops: [{ lat: 35, lng: 135 }] })
    ).toBeNull()
    expect(
      buildGoogleMapsDirectionsUrl({ origin: '京都駅', stops: [] })
    ).toBeNull()
  })
})
