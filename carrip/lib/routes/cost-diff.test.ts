import { describe, expect, it } from 'vitest'
import {
  deltaTextClass,
  deltaTone,
  diffRouteCosts,
  formatYenDelta,
  hasCostChange,
} from '@/lib/routes/cost-diff'

function costs(
  fuel: number,
  toll: number,
  parking: number,
  admission: number,
  people = 2
) {
  const total = fuel + toll + parking + admission
  return {
    cost_breakdown: { fuel, toll, parking, admission },
    total_cost: total,
    cost_per_person: Math.round(total / people),
  }
}

describe('diffRouteCosts', () => {
  it('returns per-item, total and per-person differences', () => {
    const diff = diffRouteCosts(costs(1000, 2000, 500, 0), costs(1200, 1500, 500, 800))
    expect(diff).toEqual({
      fuel: 200,
      toll: -500,
      parking: 0,
      admission: 800,
      total: 500,
      per_person: 250,
    })
  })

  it('reports no change for identical costs', () => {
    const diff = diffRouteCosts(costs(1000, 0, 0, 0), costs(1000, 0, 0, 0))
    expect(hasCostChange(diff)).toBe(false)
  })

  it('detects item changes that cancel out in the total', () => {
    const diff = diffRouteCosts(costs(1000, 500, 0, 0), costs(1500, 0, 0, 0))
    expect(diff.total).toBe(0)
    expect(hasCostChange(diff)).toBe(true)
  })
})

describe('formatYenDelta', () => {
  it('prefixes increases with + and decreases with −', () => {
    expect(formatYenDelta(1234)).toBe('+1,234円')
    expect(formatYenDelta(-800)).toBe('−800円')
    expect(formatYenDelta(0)).toBe('±0円')
  })
})

describe('deltaTone / deltaTextClass', () => {
  it('uses red for increases and green for decreases', () => {
    expect(deltaTone(1)).toBe('increase')
    expect(deltaTone(-1)).toBe('decrease')
    expect(deltaTone(0)).toBe('none')
    expect(deltaTextClass(1)).toContain('red')
    expect(deltaTextClass(-1)).toContain('emerald')
  })
})
