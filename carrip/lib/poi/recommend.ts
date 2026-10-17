import { MAX_SELECTED_SPOTS } from '@/lib/routes/schema'

/** 行き先の選び方。auto はおすすめを自動で選択済みにする */
export type SpotSelectMode = 'auto' | 'manual'

/** 1日あたりに自動で選ぶ行き先の数 */
export const AUTO_SPOTS_PER_DAY = 3

/** 旅行日数に応じて自動で選ぶ件数（1日3か所、上限は選べる最大数） */
export function recommendedSpotCount(days: number): number {
  const safeDays = Number.isFinite(days) && days >= 1 ? Math.floor(days) : 1
  return Math.min(MAX_SELECTED_SPOTS, safeDays * AUTO_SPOTS_PER_DAY)
}

/** おすすめ候補（評価順に並んだもの）の上から count 件を、重複を除いて選ぶ */
export function pickRecommendedSpots<T extends { place_id: string }>(
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
