import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resolveFuelPriceForVehicle,
  resolveFuelPricesWithFallback,
} from '@/lib/prices/fuel'
import {
  FUEL_PRICE_YEN,
  getFuelPriceYen,
  resolveFuelType,
} from '@/lib/routes/fuel'
import { buildCostBreakdown } from '@/lib/routes/cost-estimate'

describe('resolveFuelPricesWithFallback', () => {
  const originalEnv = process.env.GOVERNMENT_FUEL_API_URL

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalEnv === undefined) {
      delete process.env.GOVERNMENT_FUEL_API_URL
    } else {
      process.env.GOVERNMENT_FUEL_API_URL = originalEnv
    }
  })

  it('uses monthly fallback data when government API is not configured', async () => {
    delete process.env.GOVERNMENT_FUEL_API_URL

    const result = await resolveFuelPricesWithFallback('京都府')

    expect(result.degraded).toBe(false)
    expect(result.source).toBe('monthly_fallback')
    expect(result.prices.regular).toBe(169)
  })

  it('falls back to monthly data when government API fails', async () => {
    process.env.GOVERNMENT_FUEL_API_URL = 'https://fuel.example.com/prices'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network error'))
    )

    const result = await resolveFuelPricesWithFallback('愛知県')

    expect(result.degraded).toBe(true)
    expect(result.source).toBe('monthly_fallback')
    expect(result.prices.regular).toBe(167)
  })

  it('uses government API prices when available', async () => {
    process.env.GOVERNMENT_FUEL_API_URL = 'https://fuel.example.com/prices'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          regular: 175,
          diesel: 145,
          premium: 195,
          updated_at: '2026-06-01',
        }),
      })
    )

    const result = await resolveFuelPricesWithFallback('東京都')

    expect(result.degraded).toBe(false)
    expect(result.source).toBe('government_api')
    expect(result.prices.regular).toBe(175)
  })
})

describe('resolveFuelPriceForVehicle', () => {
  it('returns diesel price for custom diesel vehicle', async () => {
    const result = await resolveFuelPriceForVehicle('京都府', {
      type: 'custom',
      fuel_type: 'diesel',
    })

    expect(result.fuel_type).toBe('diesel')
    expect(result.price_yen).toBe(result.prices.diesel)
  })
})

describe('fixed fuel pricing helpers', () => {
  it('uses fixed unit prices for each fuel type', () => {
    expect(FUEL_PRICE_YEN.diesel).toBe(140)
    expect(FUEL_PRICE_YEN.regular).toBe(170)
    expect(FUEL_PRICE_YEN.premium).toBe(190)
  })

  it('assigns regular gasoline to compact preset', () => {
    expect(resolveFuelType({ type: 'compact' })).toBe('regular')
    expect(getFuelPriceYen({ type: 'compact' })).toBe(170)
  })
})

describe('buildCostBreakdown fuel override', () => {
  it('uses provided fuel unit price when government fallback is active', () => {
    const breakdown = buildCostBreakdown(
      {
        origin: '京都駅',
        prefecture: ['京都府'],
        departure_date: '2026-06-08',
        days: 1,
        people: 2,
        vehicle: { type: 'compact' },
      },
      200,
      0,
      [],
      0,
      169
    )

    expect(breakdown.fuel).toBe(Math.round((200 / 18) * 169))
  })
})
