import { describe, expect, it } from 'vitest'
import {
  buildItinerary,
  clockFromDateTime,
  legMinutesFromSections,
} from '@/lib/routes/itinerary'
import type { RouteStop } from '@/lib/routes/types'

function stop(id: string, lat: number, stay?: number): RouteStop {
  return { place_id: id, name: id, address: '', lat, lng: 135.7, stay_minutes: stay }
}

const origin = { lat: 35.0, lng: 135.7 }

describe('clockFromDateTime', () => {
  it('extracts the clock from ISO date-times and HH:MM strings', () => {
    expect(clockFromDateTime('2026-11-03T09:05:00+09:00')).toBe('9:05')
    expect(clockFromDateTime('08:30')).toBe('8:30')
    expect(clockFromDateTime(undefined)).toBeNull()
    expect(clockFromDateTime('soon')).toBeNull()
  })
})

describe('buildItinerary', () => {
  it('uses per-leg drive times from the route sections', () => {
    const entries = buildItinerary({
      stops: [stop('A', 35.1, 105), stop('B', 35.2, 120)],
      polyline: [origin],
      sections: [
        { type: 'point', name: '出発' },
        { type: 'move', name: '', duration_min: 25 },
        { type: 'point', name: 'A' },
        { type: 'move', name: '', duration_min: 30 },
        { type: 'point', name: 'B' },
        { type: 'move', name: '', duration_min: 40 },
      ],
      total_duration_min: 95,
      round_trip: true,
      departure_time: '2026-11-03T09:00:00+09:00',
    })

    expect(entries.map((entry) => [entry.kind, entry.time])).toEqual([
      ['departure', '9:00'],
      ['stop', '9:25'],
      ['stop', '11:40'],
      ['arrival', '14:20'],
    ])
    const first = entries[1]
    expect(first.kind === 'stop' && first.driveMinutes).toBe(25)
  })

  it('splits the total drive time by distance when sections are missing', () => {
    const entries = buildItinerary(
      {
        stops: [stop('A', 35.1), stop('B', 35.2)],
        polyline: [origin],
        sections: [],
        total_duration_min: 60,
        round_trip: false,
      },
      '08:00'
    )
    // 等間隔の2区間なので30分ずつ、滞在は既定の60分
    expect(entries.map((entry) => entry.time)).toEqual(['8:00', '8:30', '10:00'])
    expect(entries.at(-1)?.kind).toBe('stop')
  })

  it('returns only the departure when there is no point at all', () => {
    expect(
      buildItinerary({
        stops: [],
        polyline: [],
        sections: [],
        total_duration_min: 0,
      })
    ).toEqual([{ kind: 'departure', time: '9:00' }])
  })
})

describe('legMinutesFromSections', () => {
  it('ignores leading and repeated point sections', () => {
    expect(
      legMinutesFromSections([
        { type: 'point', name: '出発' },
        { type: 'move', name: '', duration_min: 10 },
        { type: 'move', name: '', duration_min: 5 },
        { type: 'point', name: 'A' },
        { type: 'point', name: 'A2' },
        { type: 'move', name: '', duration_min: 20 },
        { type: 'point', name: 'goal' },
      ])
    ).toEqual([15, 20])
  })
})
