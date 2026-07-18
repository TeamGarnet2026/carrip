import { sha256Hex } from '@/lib/crypto/sha256'
import { getNavitimeConfig } from '@/lib/navitime/config'
import { applyEtcTollDiscount } from '@/lib/toll/etc-discount'
import { extractTollYen } from '@/lib/toll/extract-toll'
import type { TollPriceQuery } from '@/lib/prices/schema'

type NavitimeFare = Record<string, number>

type NavitimeRouteResponse = {
  status_code?: number
  message?: string
  items?: Array<{
    summary?: {
      move?: {
        distance?: number
        time?: number
        fare?: NavitimeFare
      }
    }
  }>
}

export type TollPriceResult = {
  toll_yen: number
  distance_km: number
  duration_min: number
  source: 'navitime'
  cache_key: string
}

function buildStartTime(query: TollPriceQuery): string {
  const date = query.departure_date ?? new Date().toISOString().slice(0, 10)
  const time = query.departure_time ?? '08:00'
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return `${date}T${normalizedTime}`
}

export async function buildTollCacheKey(
  query: TollPriceQuery
): Promise<string> {
  const hash = await sha256Hex(JSON.stringify(query))
  return `prices:toll:${hash}`
}

function resolveTollYen(
  fare: NavitimeFare | undefined,
  query: TollPriceQuery
): number {
  if (!query.etc_card) {
    return extractTollYen(fare, query.vehicle_type, false)
  }

  const etcBaseToll = extractTollYen(fare, query.vehicle_type, true)
  const date = query.departure_date ?? new Date().toISOString().slice(0, 10)
  return applyEtcTollDiscount(etcBaseToll, {
    departureDate: date,
    departureTime: query.departure_time ?? '08:00',
    hasEtcCard: true,
  }).tollYen
}

export async function queryTollPrice(
  query: TollPriceQuery
): Promise<TollPriceResult> {
  const { apiKey, host } = getNavitimeConfig()
  const params = new URLSearchParams()
  params.set('start', `${query.start.lat},${query.start.lng}`)
  params.set('goal', `${query.goal.lat},${query.goal.lng}`)

  if (query.via?.length) {
    params.set(
      'via',
      JSON.stringify(
        query.via.map((point) => ({
          lat: point.lat,
          lon: point.lng,
        }))
      )
    )
  }

  params.set('condition', query.use_highway ? 'recommend' : 'free_only')
  params.set('start_time', buildStartTime(query))
  if (query.etc_card) {
    params.set('etc', 'use')
  }

  const response = await fetch(`https://${host}/route_car?${params.toString()}`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': host,
    },
    next: { revalidate: 0 },
  })

  const data = (await response.json()) as NavitimeRouteResponse

  if (!response.ok || data.status_code) {
    throw new Error(data.message ?? `NAVITIME API エラー (${response.status})`)
  }

  const move = data.items?.[0]?.summary?.move
  if (!move?.distance || move.time == null) {
    throw new Error('NAVITIME から有効な区間料金が取得できませんでした')
  }

  return {
    toll_yen: resolveTollYen(move.fare, query),
    distance_km: Math.round((move.distance / 1000) * 10) / 10,
    duration_min: move.time,
    source: 'navitime',
    cache_key: await buildTollCacheKey(query),
  }
}
