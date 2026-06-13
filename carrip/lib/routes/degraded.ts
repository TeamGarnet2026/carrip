export const DEGRADED_REASONS = [
  'government_fuel',
  'navitime',
  'google_routes',
  'gemini',
  'places_cache',
] as const

export type DegradedReason = (typeof DEGRADED_REASONS)[number]

export const DEGRADED_BANNER_MESSAGES: Record<DegradedReason, string> = {
  government_fuel:
    '政府の燃料価格APIが利用できないため、資源エネルギー庁の月次データで燃料費を計算しています',
  navitime:
    'NAVITIME APIが利用できないため、距離・時間は推定値、高速料金は0円で計算しています',
  google_routes:
    'Google Routes APIも利用できないため、直線距離ベースの概算で計算しています。精度が低下しています',
  gemini:
    'Gemini が利用できないため、評価順ベースのルート案を表示しています',
  places_cache:
    'Google Places APIが利用できないため、キャッシュ済みの観光スポット情報を使用しています',
}

export function collectDegradedReasons(
  ...groups: Array<DegradedReason | DegradedReason[] | undefined | null>
): DegradedReason[] {
  const seen = new Set<DegradedReason>()
  const ordered: DegradedReason[] = []

  for (const group of groups) {
    if (!group) continue
    const items = Array.isArray(group) ? group : [group]
    for (const reason of items) {
      if (seen.has(reason)) continue
      seen.add(reason)
      ordered.push(reason)
    }
  }

  return ordered
}

export function getDegradedBannerMessages(
  reasons: DegradedReason[]
): string[] {
  return reasons.map((reason) => DEGRADED_BANNER_MESSAGES[reason])
}
