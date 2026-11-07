import { PREFECTURE_META } from '@/lib/plan/prefecture-meta'
import type { OriginPlace } from '@/lib/plan/types'

/** 候補から選んだ出発地を、画面間で引き継ぐ URL パラメータに入れる */
export function setOriginPlaceParams(params: URLSearchParams, place: OriginPlace | undefined) {
  if (!place) return
  params.set('origin_lat', place.lat.toFixed(6))
  params.set('origin_lng', place.lng.toFixed(6))
  if (place.prefecture) params.set('origin_pref', place.prefecture)
}

/** URL パラメータから出発地の位置を読み取る（不正な値なら undefined） */
export function parseOriginPlaceParams(params: {
  origin_lat?: string
  origin_lng?: string
  origin_pref?: string
}): OriginPlace | undefined {
  const lat = Number(params.origin_lat)
  const lng = Number(params.origin_lng)
  if (!params.origin_lat || !params.origin_lng) return undefined
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined
  const prefecture =
    params.origin_pref && PREFECTURE_META[params.origin_pref] ? params.origin_pref : undefined
  return { lat, lng, ...(prefecture ? { prefecture } : {}) }
}
