import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  insertDriverChangeStops,
  interpolatePointOnLeg,
  parseDriveLegDurations,
  planDriverChangeInsertions,
} from '@/lib/poi/rest-area'
import * as poiSearch from '@/lib/poi/search'
import type { RouteSection } from '@/lib/routes/types'

describe('insertDriverChangeStops', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not insert both carriageways of the same service area', async () => {
    const origin = { lat: 35.0, lng: 136.5 }
    const destination = {
      id: 'dest',
      name: '目的地',
      address: '目的地',
      lat: 35.0,
      lng: 135.5,
      category: 'tourist',
    }
    const upSide = {
      id: 'sa-up',
      name: '養老SA (上り)',
      address: '岐阜県',
      lat: 35.3,
      lng: 136.55,
    }
    const downSide = { ...upSide, id: 'sa-down', name: '養老SA (下り)', lng: 136.551 }

    vi.spyOn(poiSearch, 'searchPlacesByText')
      .mockResolvedValueOnce([upSide])
      .mockResolvedValueOnce([downSide])

    const result = await insertDriverChangeStops(
      [destination],
      [
        { type: 'move', name: '高速', duration_min: 200 },
        { type: 'point', name: '目的地' },
      ],
      90,
      true,
      origin
    )

    expect(result.map((stop) => stop.id)).toEqual(['sa-up', 'dest'])
  })
})

describe('rest-area driver change planning', () => {
  const origin = { lat: 35.0116, lng: 135.7681 }
  const stopA = { lat: 34.9949, lng: 135.785 }
  const stopB = { lat: 34.985, lng: 135.79 }

  it('parses leg durations from move/point sections', () => {
    const sections: RouteSection[] = [
      { type: 'move', name: '走行1', duration_min: 80 },
      { type: 'point', name: 'A', duration_min: 30 },
      { type: 'move', name: '走行2', duration_min: 50 },
      { type: 'point', name: 'B', duration_min: 30 },
    ]

    expect(parseDriveLegDurations(sections, [origin, stopA, stopB])).toEqual([
      80, 50,
    ])
  })

  it('splits total move time when section legs do not match waypoints', () => {
    const sections: RouteSection[] = [
      {
        type: 'move',
        name: '概算走行',
        distance_km: 120,
        duration_min: 180,
      },
    ]

    const legs = parseDriveLegDurations(sections, [origin, stopA, stopB])
    expect(legs).toHaveLength(2)
    expect(legs[0] + legs[1]).toBeCloseTo(180, 5)
  })

  it('plans insertions before max drive time is exceeded on a long leg', () => {
    const sections: RouteSection[] = [
      { type: 'move', name: '走行', duration_min: 200 },
      { type: 'point', name: 'A', duration_min: 30 },
    ]

    const insertions = planDriverChangeInsertions(
      origin,
      [stopA],
      sections,
      90
    )

    expect(insertions).toHaveLength(2)
    expect(insertions[0]?.fraction).toBeCloseTo(0.45, 2)
    expect(insertions[1]?.fraction).toBeCloseTo(0.9, 2)
    expect(insertions[0]?.insertIndex).toBe(0)
    expect(insertions[1]?.insertIndex).toBe(1)
  })

  it('does not plan insertions when each leg is within the limit', () => {
    const sections: RouteSection[] = [
      { type: 'move', name: '走行1', duration_min: 70 },
      { type: 'point', name: 'A', duration_min: 30 },
      { type: 'move', name: '走行2', duration_min: 80 },
      { type: 'point', name: 'B', duration_min: 30 },
    ]

    expect(
      planDriverChangeInsertions(origin, [stopA, stopB], sections, 90)
    ).toEqual([])
  })

  it('interpolates a point along a leg', () => {
    const point = interpolatePointOnLeg(origin, stopA, 0.5)
    expect(point.lat).toBeCloseTo((origin.lat + stopA.lat) / 2, 5)
    expect(point.lng).toBeCloseTo((origin.lng + stopA.lng) / 2, 5)
  })
})
