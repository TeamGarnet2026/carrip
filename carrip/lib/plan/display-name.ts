import { formatTripLength } from '@/lib/format'

/** 京都府 → 京都、東京都 → 東京、北海道 → 北海道 */
export function shortPrefectureName(prefecture: string): string {
  if (prefecture === '北海道') return prefecture
  return prefecture.replace(/[都府県]$/, '')
}

/**
 * プランの表示名（例: 京都 日帰りドライブ / 京都・奈良 1泊2日ドライブ）。
 * プラン名は保存していないため、行き先の都道府県と日数から作る。
 */
export function planDisplayName(prefectures: string[], days: number): string {
  const area = prefectures.slice(0, 3).map(shortPrefectureName).join('・')
  const length = formatTripLength(days)
  return `${area || 'ドライブ'} ${length}ドライブ`
}
