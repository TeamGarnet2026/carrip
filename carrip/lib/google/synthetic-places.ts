import type { PoiPlace } from '@/lib/google/types'
import { PREFECTURE_META } from '@/lib/plan/prefecture-meta'

/** Places API 不可時に目的地周辺で使う概算スポット */
export function buildSyntheticPlacesForPrefecture(
  prefecture: string
): PoiPlace[] {
  const meta = PREFECTURE_META[prefecture]
  if (!meta) return []

  const offsets = [
    { dLat: 0.04, dLng: 0.03, label: '名所' },
    { dLat: -0.03, dLng: 0.05, label: '公園' },
    { dLat: 0.02, dLng: -0.04, label: '展望スポット' },
    { dLat: -0.05, dLng: -0.02, label: 'グルメエリア' },
  ]

  return offsets.map((offset, index) => ({
    id: `synthetic/${prefecture}-${index + 1}`,
    name: `${prefecture}の${offset.label}`,
    address: prefecture,
    lat: meta.lat + offset.dLat,
    lng: meta.lng + offset.dLng,
    rating: 4.2,
    userRatingCount: 100,
    category: 'tourist_spot',
  }))
}
