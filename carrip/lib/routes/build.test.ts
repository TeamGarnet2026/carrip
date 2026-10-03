import { describe, expect, it } from 'vitest'
import { buildCustomRouteSummary, orderCustomStops } from '@/lib/routes/build'
import type { RouteStop } from '@/lib/routes/types'

const request = {
  origin: '名古屋駅',
  prefecture: ['京都府'],
  departure_date: '2026-11-01',
  days: 1,
  people: 2,
  vehicle: { type: 'compact' },
}

function stop(id: string, lat: number): RouteStop {
  return { place_id: id, name: id, address: id, lat, lng: 135 }
}

describe('orderCustomStops', () => {
  const origin = { lat: 35, lng: 135 }
  const stops = [stop('far', 35.3), stop('near', 35.1)]

  it('keeps the user order in manual mode', () => {
    expect(
      orderCustomStops(origin, stops, 'manual', false).map((s) => s.place_id)
    ).toEqual(['far', 'near'])
  })

  it('reorders by distance in auto mode', () => {
    expect(
      orderCustomStops(origin, stops, 'auto', false).map((s) => s.place_id)
    ).toEqual(['near', 'far'])
  })
})

describe('buildCustomRouteSummary', () => {
  it('lists up to three stops and the road type', () => {
    const summary = buildCustomRouteSummary(
      { ...request, options: { use_highway: false } },
      [stop('A', 35), stop('B', 35), stop('C', 35), stop('D', 35)]
    )
    expect(summary).toContain('A、B、C ほか1か所')
    expect(summary).toContain('一般道のみ')
  })

  it('mentions highway use by default', () => {
    expect(buildCustomRouteSummary(request, [stop('A', 35)])).toContain(
      '高速道路を利用'
    )
  })
})
