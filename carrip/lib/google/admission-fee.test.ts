import { describe, expect, it } from 'vitest'
import {
  calculateTotalAdmissionCost,
  moneyToYen,
  needsAdmissionDetailsFetch,
  parseAdmissionFeeFromPlace,
} from '@/lib/google/admission-fee'

describe('moneyToYen', () => {
  it('converts JPY money to yen', () => {
    expect(
      moneyToYen({
        currencyCode: 'JPY',
        units: '800',
        nanos: 0,
      })
    ).toBe(800)
  })

  it('returns null for non-JPY currency', () => {
    expect(
      moneyToYen({
        currencyCode: 'USD',
        units: '10',
      })
    ).toBeNull()
  })

  it('returns null when currency is missing', () => {
    expect(moneyToYen({ units: '500' })).toBeNull()
  })
})

describe('parseAdmissionFeeFromPlace', () => {
  it('uses priceRange.startPrice as admission fee per person', () => {
    expect(
      parseAdmissionFeeFromPlace({
        priceRange: {
          startPrice: { currencyCode: 'JPY', units: '1200' },
        },
      })
    ).toBe(1200)
  })

  it('returns 0 for free places', () => {
    expect(
      parseAdmissionFeeFromPlace({
        priceLevel: 'PRICE_LEVEL_FREE',
      })
    ).toBe(0)
  })

  it('returns 0 when admission fee cannot be determined', () => {
    expect(parseAdmissionFeeFromPlace({})).toBe(0)
    expect(
      parseAdmissionFeeFromPlace({
        priceLevel: 'PRICE_LEVEL_MODERATE',
      })
    ).toBe(0)
    expect(
      parseAdmissionFeeFromPlace({
        priceRange: {
          startPrice: { currencyCode: 'USD', units: '20' },
        },
      })
    ).toBe(0)
  })
})

describe('needsAdmissionDetailsFetch', () => {
  it('skips details fetch when search result already has price data', () => {
    expect(
      needsAdmissionDetailsFetch({
        priceRange: {
          startPrice: { currencyCode: 'JPY', units: '500' },
        },
      })
    ).toBe(false)
    expect(
      needsAdmissionDetailsFetch({
        priceLevel: 'PRICE_LEVEL_FREE',
      })
    ).toBe(false)
    expect(
      needsAdmissionDetailsFetch({
        priceLevel: 'PRICE_LEVEL_MODERATE',
      })
    ).toBe(false)
  })

  it('requests details when price data is unavailable', () => {
    expect(needsAdmissionDetailsFetch({})).toBe(true)
    expect(
      needsAdmissionDetailsFetch({
        priceLevel: 'PRICE_LEVEL_UNSPECIFIED',
      })
    ).toBe(true)
  })
})

describe('calculateTotalAdmissionCost', () => {
  it('sums admission fee per stop multiplied by people', () => {
    expect(calculateTotalAdmissionCost([800, 0, 500], 4)).toBe(5200)
  })

  it('returns 0 when there are no stops or people', () => {
    expect(calculateTotalAdmissionCost([], 4)).toBe(0)
    expect(calculateTotalAdmissionCost([800], 0)).toBe(0)
  })
})
