import type { PoiPlace } from '@/lib/google/types'
import { PREFECTURE_META } from '@/lib/plan/prefecture-meta'

/** 出発地の候補として画面に返す形 */
export type OriginCandidate = {
  place_id: string
  name: string
  /** 例: 京都府。住所から読み取れなければ undefined */
  prefecture?: string
  /** 都道府県より後ろの住所（例: 京都市下京区東塩小路町） */
  locality: string
  lat: number
  lng: number
}

const PREFECTURE_NAMES = Object.keys(PREFECTURE_META)

/** 「日本、〒600-8216 京都府京都市下京区…」→「京都府京都市下京区…」 */
function stripCountryAndPostalCode(address: string): string {
  return address
    .replace(/^日本[、,]\s*/, '')
    .replace(/^〒?\d{3}-?\d{4}\s*/, '')
    .trim()
}

/** 住所から都道府県と、それより後ろの部分に分ける */
export function splitPrefecture(address: string): { prefecture?: string; locality: string } {
  const normalized = stripCountryAndPostalCode(address)
  const prefecture = PREFECTURE_NAMES.find((name) => normalized.startsWith(name))
  if (!prefecture) return { locality: normalized }
  return { prefecture, locality: normalized.slice(prefecture.length).trim() }
}

export function toOriginCandidate(place: PoiPlace): OriginCandidate {
  const { prefecture, locality } = splitPrefecture(place.address)
  return {
    place_id: place.id,
    name: place.name,
    ...(prefecture ? { prefecture } : {}),
    locality,
    lat: place.lat,
    lng: place.lng,
  }
}
