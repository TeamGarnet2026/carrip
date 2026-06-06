import { describe, expect, it } from 'vitest'
import { buildCostBreakdown } from '@/lib/routes/cost-estimate'
import type { RouteGenerateRequest } from '@/lib/routes/types'

const baseRequest: RouteGenerateRequest = {
  origin: '京都駅',
  prefecture: ['愛知県'],
  departure_date: '2026-06-08',
  days: 2,
  people: 4,
  vehicle: { type: 'compact' },
}

describe('buildCostBreakdown admission', () => {
  it('calculates admission as sum of per-person fees multiplied by people', () => {
    const breakdown = buildCostBreakdown(baseRequest, 100, 3, 2000, [800, 0, 500])

    expect(breakdown.admission).toBe(5200)
  })

  it('treats missing admission data as 0 yen', () => {
    const breakdown = buildCostBreakdown(baseRequest, 100, 2, 2000, [0, 0])

    expect(breakdown.admission).toBe(0)
  })
})
