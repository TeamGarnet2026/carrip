export const DEGRADED_REASONS = [
  'government_fuel',
  'navitime',
  'google_routes',
] as const

export type DegradedReason = (typeof DEGRADED_REASONS)[number]

export const DEGRADED_BANNER_MESSAGES: Record<DegradedReason, string> = {
  government_fuel:
    '最新の給油所価格を取得できないため、月次データまたは固定単価で燃料費を計算しています',
  navitime:
    'NAVITIME APIが利用できなかったルートは、距離・時間を推定値、高速料金を0円で計算しています',
  google_routes:
    'Google Routes APIも利用できないため、直線距離ベースの概算で計算しています。精度が低下しています',
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
  // 以前のバージョンで保存された不明な理由は表示しない
  return reasons
    .map((reason) => DEGRADED_BANNER_MESSAGES[reason])
    .filter((message): message is string => message != null)
}
