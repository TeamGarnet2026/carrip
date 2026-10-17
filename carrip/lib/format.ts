const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/** 2026-11-03 → 11月3日（火） */
export function formatJapaneseDate(iso: string): string {
  const date = parseIsoDate(iso)
  if (!date) return iso
  return `${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAYS[date.getDay()]}）`
}

/** 2026-11-03 → 11/3（火） */
export function formatShortDate(iso: string): string {
  const date = parseIsoDate(iso)
  if (!date) return iso
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`
}

/** 旅行日数 → 日帰り / 1泊2日 … */
export function formatTripLength(days: number): string {
  if (!Number.isFinite(days) || days <= 1) return '日帰り'
  return `${days - 1}泊${days}日`
}

/** 2850 → ¥2,850 */
export function formatYen(amount: number): string {
  return `¥${Math.round(amount).toLocaleString('ja-JP')}`
}

/** 分 → 3時間10分 / 45分 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${rest}分`
  if (rest === 0) return `${hours}時間`
  return `${hours}時間${rest}分`
}

/** "08:00" に分を足した時刻（"9:25"）。24時を超えたら翌日として折り返す */
export function addMinutesToClock(clock: string, minutes: number): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(clock)
  if (!match) return clock
  const total = (Number(match[1]) * 60 + Number(match[2]) + Math.round(minutes)) % (24 * 60)
  const normalized = total < 0 ? total + 24 * 60 : total
  return `${Math.floor(normalized / 60)}:${String(normalized % 60).padStart(2, '0')}`
}
