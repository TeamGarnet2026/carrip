import { haversineKm, type LatLng } from '@/lib/maps/route-corridor'
import { optimizeStopOrder } from '@/lib/routes/order-stops'
import { MAX_SELECTED_SPOTS } from '@/lib/routes/schema'

/** 行き先の選び方。auto はおすすめを自動で選択済みにする */
export type SpotSelectMode = 'auto' | 'manual'

/** 1日あたりに自動で選ぶ行き先の数 */
export const AUTO_SPOTS_PER_DAY = 3

/**
 * 車ルートに載せにくい島嶼系スポット。
 * 「広島」など地名に含まれる「島」は除外しない。
 */
const LIKELY_NON_DRIVABLE_NAME = /(?<![広])島/

/** 直線距離のペナルティを効かせる距離スケール（km） */
const TOUR_DISTANCE_SCALE_KM = 40

export type RecommendableSpot = {
  place_id: string
  name?: string
  lat: number
  lng: number
  rating?: number | null
}

export type PickRecommendedOptions = {
  /** あると出発地から回れる順に近い候補を優先し、最後に順番を整える */
  origin?: LatLng
  roundTrip?: boolean
}

/** 旅行日数に応じて自動で選ぶ件数（1日3か所、上限は選べる最大数） */
export function recommendedSpotCount(days: number): number {
  const safeDays = Number.isFinite(days) && days >= 1 ? Math.floor(days) : 1
  return Math.min(MAX_SELECTED_SPOTS, safeDays * AUTO_SPOTS_PER_DAY)
}

/** 名前から見て、車でのルート計算に載せにくい地点か */
export function isLikelyCarRoutableSpot(name: string): boolean {
  return !LIKELY_NON_DRIVABLE_NAME.test(name)
}

function pickTopUnique<T extends { place_id: string }>(
  places: T[],
  count: number
): T[] {
  const picked: T[] = []
  const seen = new Set<string>()
  for (const place of places) {
    if (picked.length >= count) break
    if (seen.has(place.place_id)) continue
    seen.add(place.place_id)
    picked.push(place)
  }
  return picked
}

/**
 * 評価を保ちつつ、いまいる地点から遠くへ飛びすぎない候補を順に足す。
 * 評価順だけで県内を飛び回ると NAVITIME が経路を組めないことがある。
 */
function pickAlongTour<T extends RecommendableSpot>(
  origin: LatLng,
  places: T[],
  count: number
): T[] {
  const remaining = [...places]
  const picked: T[] = []
  let current = origin

  while (picked.length < count && remaining.length > 0) {
    let bestIndex = 0
    let bestScore = -Infinity

    for (let i = 0; i < remaining.length; i += 1) {
      const place = remaining[i]
      const distanceKm = haversineKm(
        current.lat,
        current.lng,
        place.lat,
        place.lng
      )
      const rating = place.rating ?? 3
      const score = rating / (1 + distanceKm / TOUR_DISTANCE_SCALE_KM)
      if (score > bestScore) {
        bestScore = score
        bestIndex = i
      }
    }

    const [next] = remaining.splice(bestIndex, 1)
    picked.push(next)
    current = next
  }

  return picked
}

/**
 * おすすめ候補から count 件を選ぶ。
 * 出発地があれば、車で回りやすい順に近い選び方＋順番整列をする。
 */
export function pickRecommendedSpots<T extends RecommendableSpot>(
  places: T[],
  count: number,
  options: PickRecommendedOptions = {}
): T[] {
  if (count <= 0 || places.length === 0) return []

  const routable = places.filter(
    (place) => !place.name || isLikelyCarRoutableSpot(place.name)
  )
  // 島嶼フィルタで足りなくなったときだけ、元の一覧に戻す
  const pool = routable.length > 0 ? routable : places
  const { origin, roundTrip = true } = options

  const picked = origin
    ? pickAlongTour(origin, pool, count)
    : pickTopUnique(pool, count)

  if (!origin || picked.length <= 1) return picked
  return optimizeStopOrder(origin, picked, roundTrip)
}

/** 行き先の選び方の初期値（まだ何も選んでいなければ自動選択） */
export function defaultSpotSelectMode(
  savedMode: SpotSelectMode | undefined,
  selectedCount: number
): SpotSelectMode {
  if (savedMode) return savedMode
  return selectedCount === 0 ? 'auto' : 'manual'
}

/**
 * おすすめを取得したときに、自動で選び直してよいか。
 * 自動選択モードで、まだ何も選んでいないか、前回も自動で選んだまま編集していないときだけ。
 */
export function shouldAutoPick(input: {
  mode: SpotSelectMode
  selectedCount: number
  autoPicked: boolean
}): boolean {
  if (input.mode !== 'auto') return false
  return input.selectedCount === 0 || input.autoPicked
}
