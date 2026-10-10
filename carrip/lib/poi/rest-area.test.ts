import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  insertDriverChangeStops,
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

  it('picks stops along the driven road instead of the straight line', async () => {
    const origin = { lat: 35.0, lng: 136.0 }
    const destination = {
      id: 'dest',
      name: '目的地',
      address: '目的地',
      lat: 35.0,
      lng: 135.0,
      category: 'destination',
    }
    // 一般道が北へ大きく迂回している（直線上の店に寄ると往復の無駄が出る）
    const polyline = [
      origin,
      { lat: 35.5, lng: 136.0 },
      { lat: 35.5, lng: 135.0 },
      { lat: 35.0, lng: 135.0 },
    ]
    const store = (id: string, lat: number, lng: number) => ({
      id,
      name: `ローソン ${id}`,
      address: '',
      lat,
      lng,
    })

    vi.spyOn(poiSearch, 'searchPlacesByText')
      .mockResolvedValueOnce([
        store('straight-1', 35.0, 135.78),
        store('road-1', 35.501, 135.78),
      ])
      .mockResolvedValueOnce([
        store('road-2', 35.46, 135.001),
        store('straight-2', 35.0, 135.4),
      ])

    const result = await insertDriverChangeStops(
      [destination],
      [
        { type: 'move', name: '一般道', duration_min: 240 },
        { type: 'point', name: '目的地' },
      ],
      90,
      false,
      origin,
      false,
      polyline
    )

    expect(result.map((stop) => stop.id)).toEqual(['road-1', 'road-2', 'dest'])
  })

  it('skips the service area on the opposite carriageway', async () => {
    const origin = { lat: 35.0, lng: 136.5 }
    const destination = {
      id: 'dest',
      name: '目的地',
      address: '目的地',
      lat: 35.0,
      lng: 135.5,
      category: 'destination',
    }
    // 西向きに走るので、左側通行では南側が自分の車線
    const polyline = [origin, { lat: 35.0, lng: 136.0 }, destination]
    const sa = (id: string, lat: number) => ({
      id,
      name: `テストSA (${id})`,
      address: '',
      lat,
      lng: 135.75,
    })

    vi.spyOn(poiSearch, 'searchPlacesByText').mockResolvedValueOnce([
      sa('opposite', 35.002),
      sa('same-side', 34.998),
    ])

    const result = await insertDriverChangeStops(
      [destination],
      [
        { type: 'move', name: '高速', duration_min: 120 },
        { type: 'point', name: '目的地' },
      ],
      90,
      true,
      origin,
      false,
      polyline
    )

    expect(result.map((stop) => stop.id)).toEqual(['same-side', 'dest'])
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
})
