import { describe, expect, it } from 'vitest'
import {
  FUEL_PRICE_YEN,
  getFuelPriceYen,
  resolveFuelType,
} from '@/lib/routes/fuel'
import { buildCostBreakdown } from '@/lib/routes/cost-estimate'

describe('fuel pricing', () => {
  it('uses fixed unit prices for each fuel type', () => {
    expect(FUEL_PRICE_YEN.diesel).toBe(140)
    expect(FUEL_PRICE_YEN.regular).toBe(170)
    expect(FUEL_PRICE_YEN.premium).toBe(190)
  })

  it('assigns regular gasoline to compact preset', () => {
    expect(resolveFuelType({ type: 'compact' })).toBe('regular')
    expect(getFuelPriceYen({ type: 'compact' })).toBe(170)
  })

  it('uses selected fuel type for custom vehicle', () => {
    expect(resolveFuelType({ type: 'custom', fuel_type: 'diesel' })).toBe(
      'diesel'
    )
    expect(getFuelPriceYen({ type: 'custom', fuel_type: 'premium' })).toBe(190)
  })
})

describe('buildCostBreakdown fuel', () => {
  it('calculates fuel cost with diesel price for custom vehicle', () => {
    const breakdown = buildCostBreakdown(
      {
        origin: '京都駅',
        prefecture: ['京都府'],
        departure_date: '2026-06-08',
        days: 1,
        people: 2,
        vehicle: { type: 'custom', fuel_km_l: 20, fuel_type: 'diesel' },
      },
      200,
      0
    )

    expect(breakdown.fuel).toBe(Math.round((200 / 20) * 140))
  })

  it('calculates fuel cost with premium price when explicitly selected', () => {
    const breakdown = buildCostBreakdown(
      {
        origin: '京都駅',
        prefecture: ['京都府'],
        departure_date: '2026-06-08',
        days: 1,
        people: 2,
        vehicle: { type: 'sedan', fuel_type: 'premium' },
      },
      150,
      0
    )

    expect(breakdown.fuel).toBe(Math.round((150 / 15) * 190))
  })
})
