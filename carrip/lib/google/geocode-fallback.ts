import { PREFECTURE_META } from '@/lib/plan/prefecture-meta'

export type LatLng = { lat: number; lng: number }

/** Places API を使わず解決できる主要ランドマーク（駅・空港など） */
const LANDMARK_COORDS: Record<string, LatLng> = {
  京都駅: { lat: 34.985849, lng: 135.758767 },
  京都: { lat: 34.985849, lng: 135.758767 },
  東京駅: { lat: 35.681236, lng: 139.767125 },
  東京: { lat: 35.681236, lng: 139.767125 },
  大阪駅: { lat: 34.702485, lng: 135.495951 },
  大阪: { lat: 34.702485, lng: 135.495951 },
  名古屋駅: { lat: 35.170915, lng: 136.881537 },
  名古屋: { lat: 35.170915, lng: 136.881537 },
  横浜駅: { lat: 35.46579, lng: 139.622319 },
  札幌駅: { lat: 43.068661, lng: 141.350755 },
  福岡空港: { lat: 33.585925, lng: 130.450604 },
  関西空港: { lat: 34.434, lng: 135.2327 },
  羽田空港: { lat: 35.5494, lng: 139.7798 },
  成田空港: { lat: 35.7719, lng: 140.3929 },
}

function normalizeGeocodeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, '')
    .replace(/　/g, '')
}

/**
 * Places API 枠を消費しないローカル座標解決。
 * 都道府県名・主要ランドマークにヒットすれば返す。
 */
export function lookupLocalGeocode(query: string): LatLng | null {
  const normalized = normalizeGeocodeQuery(query)
  if (!normalized) return null

  const prefecture = PREFECTURE_META[normalized]
  if (prefecture) {
    return { lat: prefecture.lat, lng: prefecture.lng }
  }

  const landmark = LANDMARK_COORDS[normalized]
  if (landmark) return landmark

  for (const [name, coords] of Object.entries(LANDMARK_COORDS)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return coords
    }
  }

  for (const [name, meta] of Object.entries(PREFECTURE_META)) {
    if (normalized.includes(name)) {
      return { lat: meta.lat, lng: meta.lng }
    }
  }

  return null
}
