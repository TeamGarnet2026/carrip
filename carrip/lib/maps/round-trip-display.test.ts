import { describe, expect, it } from 'vitest'
import {
  buildRoundTripStopLegs,
  computeRoundTripLegDurations,
  formatRouteDuration,
  isRoundTripRoute,
  isSameDepartureArrival,
  mapMarkerColor,
  roundTripStopNumber,
  roundTripStopTitlePrefix,
  ROUND_TRIP_OUTBOUND_COLOR,
  ROUND_TRIP_RETURN_COLOR,
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

  it('splits at last tourist stop, not a rest stop on the return leg', () => {
    const returnPolyline = [
      { lat: 35, lng: 135 },
      { lat: 35.5, lng: 135.5 },
      { lat: 36, lng: 136 },
      { lat: 35.8, lng: 135.8 },
      { lat: 35.001, lng: 135.001 },
    ]
    const legs = splitRoundTripPolyline(returnPolyline, [
      { lat: 35.5, lng: 135.5 },
      { lat: 36, lng: 136 },
      { lat: 35.8, lng: 135.8, is_rest_stop: true },
    ])
    expect(legs!.outbound.at(-1)).toEqual({ lat: 36, lng: 136 })
    expect(legs!.returnLeg[0]).toEqual({ lat: 36, lng: 136 })
    expect(legs!.returnLeg).toContainEqual({ lat: 35.8, lng: 135.8 })
  })

  it('uses last tourist stop along the route, not the geographically farthest', () => {
    const multiStopPolyline = [
      { lat: 35, lng: 135 },
      { lat: 36.5, lng: 138 },
      { lat: 36, lng: 139.5 },
      { lat: 35.001, lng: 135.001 },
    ]
    const legs = splitRoundTripPolyline(multiStopPolyline, [
      { lat: 36.5, lng: 138 },
      { lat: 36, lng: 139.5 },
    ])
    expect(legs!.outbound.at(-1)).toEqual({ lat: 36, lng: 139.5 })
    expect(legs!.returnLeg[0]).toEqual({ lat: 36, lng: 139.5 })
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

describe('buildRoundTripStopLegs', () => {
  const polyline = [
    { lat: 35, lng: 135 },
    { lat: 35.5, lng: 135.5 },
    { lat: 36, lng: 136 },
    { lat: 35.8, lng: 135.8 },
    { lat: 35.001, lng: 135.001 },
  ]

  it('classifies stops before and after the destination', () => {
    const legs = buildRoundTripStopLegs(polyline, [
      { lat: 35.5, lng: 135.5 },
      { lat: 36, lng: 136 },
      { lat: 35.8, lng: 135.8, is_rest_stop: true },
    ])
    expect(legs).toEqual(['outbound', 'outbound', 'return'])
  })

  it('numbers stops separately for each leg', () => {
    const legs = buildRoundTripStopLegs(polyline, [
      { lat: 35.5, lng: 135.5 },
      { lat: 36, lng: 136 },
      { lat: 35.8, lng: 135.8, is_rest_stop: true },
    ])
    expect(roundTripStopNumber(legs, 0)).toBe(1)
    expect(roundTripStopNumber(legs, 1)).toBe(2)
    expect(roundTripStopNumber(legs, 2)).toBe(1)
    expect(roundTripStopTitlePrefix(legs, 2)).toBe('帰り 1. ')
  })
})

describe('mapMarkerColor', () => {
  it('uses return color for return-leg stops', () => {
    expect(mapMarkerColor('stop', true, 'return')).toBe(ROUND_TRIP_RETURN_COLOR)
    expect(mapMarkerColor('stop', true, 'outbound')).toBe(
      ROUND_TRIP_OUTBOUND_COLOR
    )
  })
})

describe('computeRoundTripLegDurations', () => {
  const polyline = [
    { lat: 35, lng: 135 },
    { lat: 35.5, lng: 135.5 },
    { lat: 36, lng: 136 },
    { lat: 35.8, lng: 135.8 },
    { lat: 35.001, lng: 135.001 },
  ]
  const stops = [
    { lat: 35.5, lng: 135.5 },
    { lat: 36, lng: 136 },
    { lat: 35.8, lng: 135.8, is_rest_stop: true },
  ]

  it('splits section durations at the last outbound stop', () => {
    const durations = computeRoundTripLegDurations({
      polyline,
      stops,
      sections: [
        { type: 'move', name: '走行1', duration_min: 60 },
        { type: 'point', name: 'A' },
        { type: 'move', name: '走行2', duration_min: 40 },
        { type: 'point', name: 'B' },
        { type: 'move', name: '走行3', duration_min: 25 },
        { type: 'point', name: 'SA' },
        { type: 'move', name: '走行4', duration_min: 35 },
      ],
      total_duration_min: 160,
    })
    expect(durations).toEqual({ outboundMin: 100, returnMin: 60 })
  })

  it('formats round-trip duration as outbound and return labels', () => {
    expect(
      formatRouteDuration({
        round_trip: true,
        polyline,
        stops: [{ lat: 36, lng: 136 }],
        sections: [
          { type: 'move', name: '走行1', duration_min: 90 },
          { type: 'point', name: 'A' },
          { type: 'move', name: '走行2', duration_min: 30 },
        ],
        total_duration_min: 120,
      })
    ).toBe('行 1時間30分 · 帰 30分')
  })
})
