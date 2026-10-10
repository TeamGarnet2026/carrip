import { addMinutesToClock } from '@/lib/format'
import { parseDriveLegDurations } from '@/lib/poi/rest-area'
import type { RouteCandidate, RouteSection, RouteStop } from '@/lib/routes/types'

/** 立ち寄りの滞在時間が未設定のときの目安（分） */
const DEFAULT_STAY_MINUTES = 60

export type ItineraryEntry =
  | { kind: 'departure'; time: string }
  | {
      kind: 'stop'
      stop: RouteStop
      index: number
      time: string
      stayMinutes: number
      driveMinutes: number
    }
  | { kind: 'arrival'; time: string }

/** "2026-11-03T09:00:00+09:00" や "09:00" から "9:00" を取り出す */
export function clockFromDateTime(value: string | undefined): string | null {
  if (!value) return null
  const match = /(?:T|^)(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return null
  return `${Number(match[1])}:${match[2]}`
}

/**
 * 経路の区間（move / point）から、地点と地点のあいだの運転時間を順に取り出す。
 * 先頭の出発地点や連続する point では区切らない（move を含む区間だけを1区間とする）
 */
export function legMinutesFromSections(sections: RouteSection[]): number[] {
  const legs: number[] = []
  let current = 0
  let hasMove = false
  for (const section of sections) {
    if (section.type === 'move') {
      current += section.duration_min ?? 0
      hasMove = true
    } else if (section.type === 'point' && hasMove) {
      legs.push(current)
      current = 0
      hasMove = false
    }
  }
  if (hasMove) legs.push(current)
  return legs
}

/**
 * 出発時刻・区間ごとの運転時間・滞在時間から、各地点に着く時刻の目安を作る。
 * 区間ごとの時間が取れないときは、総運転時間を地点間の距離で按分する。
 */
export function buildItinerary(
  route: Pick<
    RouteCandidate,
    'stops' | 'polyline' | 'sections' | 'total_duration_min' | 'round_trip' | 'departure_time'
  >,
  fallbackDepartureTime = '09:00'
): ItineraryEntry[] {
  const departure =
    clockFromDateTime(route.departure_time) ??
    clockFromDateTime(fallbackDepartureTime) ??
    '9:00'
  const stops = route.stops
  const origin = route.polyline[0] ?? stops[0]
  if (!origin) return [{ kind: 'departure', time: departure }]

  const roundTrip = route.round_trip === true
  const waypoints = [
    origin,
    ...stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
    ...(roundTrip ? [origin] : []),
  ]

  const expectedLegs = waypoints.length - 1
  const fromSections = legMinutesFromSections(route.sections ?? [])
  let legs =
    fromSections.length === expectedLegs
      ? fromSections
      : parseDriveLegDurations(route.sections ?? [], waypoints)
  if (legs.reduce((sum, minutes) => sum + minutes, 0) === 0 && route.total_duration_min > 0) {
    legs = parseDriveLegDurations(
      [{ type: 'move', name: '', duration_min: route.total_duration_min }],
      waypoints
    )
  }

  const entries: ItineraryEntry[] = [{ kind: 'departure', time: departure }]
  let elapsed = 0
  stops.forEach((stop, index) => {
    const driveMinutes = Math.round(legs[index] ?? 0)
    elapsed += driveMinutes
    const stayMinutes = stop.stay_minutes ?? DEFAULT_STAY_MINUTES
    entries.push({
      kind: 'stop',
      stop,
      index,
      time: addMinutesToClock(departure, elapsed),
      stayMinutes,
      driveMinutes,
    })
    elapsed += stayMinutes
  })

  if (roundTrip) {
    elapsed += Math.round(legs[stops.length] ?? 0)
    entries.push({ kind: 'arrival', time: addMinutesToClock(departure, elapsed) })
  }

  return entries
}
