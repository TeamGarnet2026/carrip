/**
 * NEXCO ETC 時間帯割引（簡略モデル）
 * - 休日割引: 土日祝 30%
 * - 深夜割引: 22:00〜翌6:00 30%
 * - 朝夕割引: 平日 6:00〜9:00 / 17:00〜20:00 最大50%
 *
 * 複数該当時は最大割引率を適用する。
 */

export type EtcDiscountType = 'none' | 'holiday' | 'late_night' | 'off_peak'

export const ETC_DISCOUNT_RATES = {
  holiday: 0.3,
  late_night: 0.3,
  off_peak: 0.5,
} as const

/** 2025–2027 年の日本の祝日（振替休日含む） */
const JAPANESE_PUBLIC_HOLIDAYS = new Set([
  '2025-01-01',
  '2025-01-13',
  '2025-02-11',
  '2025-02-23',
  '2025-02-24',
  '2025-03-20',
  '2025-04-29',
  '2025-05-03',
  '2025-05-04',
  '2025-05-05',
  '2025-05-06',
  '2025-07-21',
  '2025-08-11',
  '2025-09-15',
  '2025-09-23',
  '2025-10-13',
  '2025-11-03',
  '2025-11-23',
  '2025-11-24',
  '2026-01-01',
  '2026-01-12',
  '2026-02-11',
  '2026-02-23',
  '2026-03-20',
  '2026-04-29',
  '2026-05-03',
  '2026-05-04',
  '2026-05-05',
  '2026-05-06',
  '2026-07-20',
  '2026-08-11',
  '2026-09-21',
  '2026-09-22',
  '2026-09-23',
  '2026-10-12',
  '2026-11-03',
  '2026-11-23',
  '2027-01-01',
  '2027-01-11',
  '2027-02-11',
  '2027-02-23',
  '2027-03-21',
  '2027-04-29',
  '2027-05-03',
  '2027-05-04',
  '2027-05-05',
  '2027-07-19',
  '2027-08-11',
  '2027-09-20',
  '2027-09-23',
  '2027-10-11',
  '2027-11-03',
  '2027-11-23',
])

export type EtcTollDiscountInput = {
  departureDate: string
  departureTime: string
  hasEtcCard: boolean
}

export type EtcTollDiscountResult = {
  tollYen: number
  discountRate: number
  discountType: EtcDiscountType
}

function parseTimeMinutes(time: string): number {
  const [hourPart, minutePart] = time.split(':')
  const hour = Number(hourPart)
  const minute = Number(minutePart ?? 0)
  return hour * 60 + minute
}

export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00`).getDay()
  return day === 0 || day === 6
}

export function isJapanesePublicHoliday(date: string): boolean {
  return JAPANESE_PUBLIC_HOLIDAYS.has(date)
}

export function isHolidayDiscountDay(date: string): boolean {
  return isWeekend(date) || isJapanesePublicHoliday(date)
}

export function isLateNightDeparture(departureTime: string): boolean {
  const minutes = parseTimeMinutes(departureTime)
  return minutes >= 22 * 60 || minutes < 6 * 60
}

export function isOffPeakWeekdayDeparture(
  departureDate: string,
  departureTime: string
): boolean {
  if (isHolidayDiscountDay(departureDate)) return false

  const minutes = parseTimeMinutes(departureTime)
  const morningWindow = minutes >= 6 * 60 && minutes < 9 * 60
  const eveningWindow = minutes >= 17 * 60 && minutes < 20 * 60
  return morningWindow || eveningWindow
}

export function resolveEtcDiscountRate(input: {
  departureDate: string
  departureTime: string
}): { rate: number; type: EtcDiscountType } {
  const candidates: Array<{ rate: number; type: EtcDiscountType }> = []

  if (isHolidayDiscountDay(input.departureDate)) {
    candidates.push({ rate: ETC_DISCOUNT_RATES.holiday, type: 'holiday' })
  }

  if (isLateNightDeparture(input.departureTime)) {
    candidates.push({ rate: ETC_DISCOUNT_RATES.late_night, type: 'late_night' })
  }

  if (isOffPeakWeekdayDeparture(input.departureDate, input.departureTime)) {
    candidates.push({ rate: ETC_DISCOUNT_RATES.off_peak, type: 'off_peak' })
  }

  if (candidates.length === 0) {
    return { rate: 0, type: 'none' }
  }

  return candidates.reduce((best, current) =>
    current.rate > best.rate ? current : best
  )
}

export function applyEtcTollDiscount(
  baseTollYen: number,
  input: EtcTollDiscountInput
): EtcTollDiscountResult {
  if (!input.hasEtcCard || baseTollYen <= 0) {
    return {
      tollYen: baseTollYen,
      discountRate: 0,
      discountType: 'none',
    }
  }

  const { rate, type } = resolveEtcDiscountRate({
    departureDate: input.departureDate,
    departureTime: input.departureTime,
  })

  if (rate === 0) {
    return {
      tollYen: baseTollYen,
      discountRate: 0,
      discountType: 'none',
    }
  }

  return {
    tollYen: Math.round(baseTollYen * (1 - rate)),
    discountRate: rate,
    discountType: type,
  }
}
