import { describe, expect, it } from 'vitest'
import {
  isRoundTripRoute,
  isSameDepartureArrival,
  splitRoundTripPolyline,
} from '@/lib/maps/round-trip-display'

describe('isRoundTripRoute', () => {
  it('respects explicit round_trip flag', () => {
    expect(
      isRoundTripRoute({
        round_trip: true,
        polyline: [{ lat: 35, lng: 135 }],
      })
    ).toBe(true)
    expect(
      isRoundTripRoute({
        round_trip: false,
        polyline: [
          { lat: 35, lng: 135 },
          { lat: 35.001, lng: 135.001 },
        ],
      })
    ).toBe(false)
  })

  it('infers round trip when polyline endpoints are close', () => {
    expect(
      isRoundTripRoute({
        polyline: [
          { lat: 35, lng: 135 },
          { lat: 36, lng: 136 },
          { lat: 35.001, lng: 135.001 },
        ],
      })
    ).toBe(true)
  })
})

describe('splitRoundTripPolyline', () => {
  const polyline = [
    { lat: 35, lng: 135 },
    { lat: 35.5, lng: 135.5 },
    { lat: 36, lng: 136 },
    { lat: 35.5, lng: 135.5 },
    { lat: 35.001, lng: 135.001 },
  ]

  it('splits at farthest point from origin', () => {
    const legs = splitRoundTripPolyline(polyline)
    expect(legs).not.toBeNull()
    expect(legs!.outbound[0]).toEqual({ lat: 35, lng: 135 })
    expect(legs!.outbound.at(-1)).toEqual({ lat: 36, lng: 136 })
    expect(legs!.returnLeg[0]).toEqual({ lat: 36, lng: 136 })
    expect(legs!.returnLeg.at(-1)).toEqual({ lat: 35.001, lng: 135.001 })
  })

  it('prefers split near last stop when provided', () => {
    const legs = splitRoundTripPolyline(polyline, [{ lat: 35.5, lng: 135.5 }])
    expect(legs!.outbound.at(-1)).toEqual({ lat: 35.5, lng: 135.5 })
  })
})

describe('isSameDepartureArrival', () => {
  it('returns true for nearby endpoints', () => {
    expect(
      isSameDepartureArrival([
        { lat: 35, lng: 135 },
        { lat: 35.0001, lng: 135.0001 },
      ])
    ).toBe(true)
  })
})
