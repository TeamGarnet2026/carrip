import { describe, expect, it } from 'vitest'
import {
  applyEtcTollDiscount,
  ETC_DISCOUNT_RATES,
  isHolidayDiscountDay,
  isLateNightDeparture,
  isOffPeakWeekdayDeparture,
  resolveEtcDiscountRate,
} from '@/lib/toll/etc-discount'

const BASE_TOLL = 1000

describe('resolveEtcDiscountRate', () => {
  it('applies 30% holiday discount on Saturday', () => {
    const result = resolveEtcDiscountRate({
      departureDate: '2026-06-06',
      departureTime: '10:00',
    })

    expect(result.rate).toBe(ETC_DISCOUNT_RATES.holiday)
    expect(result.type).toBe('holiday')
  })

  it('applies 30% holiday discount on public holiday', () => {
    const result = resolveEtcDiscountRate({
      departureDate: '2026-01-01',
      departureTime: '10:00',
    })

    expect(result.rate).toBe(ETC_DISCOUNT_RATES.holiday)
    expect(result.type).toBe('holiday')
  })

  it('applies 30% late-night discount between 22:00 and 06:00', () => {
    const lateNight = resolveEtcDiscountRate({
      departureDate: '2026-06-08',
      departureTime: '23:00',
    })
    const earlyMorning = resolveEtcDiscountRate({
      departureDate: '2026-06-08',
      departureTime: '05:30',
    })

    expect(lateNight.rate).toBe(ETC_DISCOUNT_RATES.late_night)
    expect(lateNight.type).toBe('late_night')
    expect(earlyMorning.rate).toBe(ETC_DISCOUNT_RATES.late_night)
    expect(earlyMorning.type).toBe('late_night')
  })

  it('applies up to 50% off-peak discount on weekday morning/evening windows', () => {
    const morning = resolveEtcDiscountRate({
      departureDate: '2026-06-08',
      departureTime: '08:00',
    })
    const evening = resolveEtcDiscountRate({
      departureDate: '2026-06-08',
      departureTime: '18:00',
    })

    expect(morning.rate).toBe(ETC_DISCOUNT_RATES.off_peak)
    expect(morning.type).toBe('off_peak')
    expect(evening.rate).toBe(ETC_DISCOUNT_RATES.off_peak)
    expect(evening.type).toBe('off_peak')
  })

  it('applies the best discount when holiday and late-night overlap', () => {
    const result = resolveEtcDiscountRate({
      departureDate: '2026-06-06',
      departureTime: '23:00',
    })

    expect(result.rate).toBe(ETC_DISCOUNT_RATES.late_night)
    expect(['holiday', 'late_night']).toContain(result.type)
  })
})

describe('applyEtcTollDiscount', () => {
  it('applies 30% holiday discount with ETC card', () => {
    const result = applyEtcTollDiscount(BASE_TOLL, {
      departureDate: '2026-06-06',
      departureTime: '10:00',
      hasEtcCard: true,
    })

    expect(result.discountRate).toBe(0.3)
    expect(result.discountType).toBe('holiday')
    expect(result.tollYen).toBe(700)
  })

  it('applies 30% late-night discount with ETC card', () => {
    const result = applyEtcTollDiscount(BASE_TOLL, {
      departureDate: '2026-06-08',
      departureTime: '23:00',
      hasEtcCard: true,
    })

    expect(result.discountRate).toBe(0.3)
    expect(result.discountType).toBe('late_night')
    expect(result.tollYen).toBe(700)
  })

  it('applies 50% off-peak discount with ETC card', () => {
    const result = applyEtcTollDiscount(BASE_TOLL, {
      departureDate: '2026-06-08',
      departureTime: '08:00',
      hasEtcCard: true,
    })

    expect(result.discountRate).toBe(0.5)
    expect(result.discountType).toBe('off_peak')
    expect(result.tollYen).toBe(500)
  })

  it('does not apply discounts without an ETC card', () => {
    const holiday = applyEtcTollDiscount(BASE_TOLL, {
      departureDate: '2026-06-06',
      departureTime: '10:00',
      hasEtcCard: false,
    })
    const lateNight = applyEtcTollDiscount(BASE_TOLL, {
      departureDate: '2026-06-08',
      departureTime: '23:00',
      hasEtcCard: false,
    })
    const offPeak = applyEtcTollDiscount(BASE_TOLL, {
      departureDate: '2026-06-08',
      departureTime: '08:00',
      hasEtcCard: false,
    })

    expect(holiday).toEqual({
      tollYen: BASE_TOLL,
      discountRate: 0,
      discountType: 'none',
    })
    expect(lateNight).toEqual({
      tollYen: BASE_TOLL,
      discountRate: 0,
      discountType: 'none',
    })
    expect(offPeak).toEqual({
      tollYen: BASE_TOLL,
      discountRate: 0,
      discountType: 'none',
    })
  })

  it('returns base toll when no discount window matches', () => {
    const result = applyEtcTollDiscount(BASE_TOLL, {
      departureDate: '2026-06-08',
      departureTime: '12:00',
      hasEtcCard: true,
    })

    expect(result).toEqual({
      tollYen: BASE_TOLL,
      discountRate: 0,
      discountType: 'none',
    })
  })
})

describe('discount window helpers', () => {
  it('detects holiday discount days', () => {
    expect(isHolidayDiscountDay('2026-06-06')).toBe(true)
    expect(isHolidayDiscountDay('2026-01-01')).toBe(true)
    expect(isHolidayDiscountDay('2026-06-08')).toBe(false)
  })

  it('detects late-night departures', () => {
    expect(isLateNightDeparture('22:00')).toBe(true)
    expect(isLateNightDeparture('05:59')).toBe(true)
    expect(isLateNightDeparture('08:00')).toBe(false)
  })

  it('detects weekday off-peak departures only on weekdays', () => {
    expect(isOffPeakWeekdayDeparture('2026-06-08', '08:00')).toBe(true)
    expect(isOffPeakWeekdayDeparture('2026-06-06', '08:00')).toBe(false)
    expect(isOffPeakWeekdayDeparture('2026-06-08', '12:00')).toBe(false)
  })
})
