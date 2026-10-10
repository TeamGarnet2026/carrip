import { describe, expect, it } from 'vitest'
import {
  BASE_WEIGHTS,
  costScore,
  poiScore,
  rankRoutes,
  resolveWeights,
  scenicScore,
  scoreRoutes,
  timeScore,
} from '@/lib/routes/scoring'
import type { RouteCandidate, RouteStop } from '@/lib/routes/types'

function stop(name: string, extra: Partial<RouteStop> = {}): RouteStop {
  return {
    place_id: name,
    name,
    address: '京都府',
    lat: 35,
    lng: 135.7,
    category: 'tourist',
    ...extra,
  }
}

function route(
  id: string,
  totalCost: number,
  durationMin: number,
  stops: RouteStop[] = [],
  people = 2
): RouteCandidate {
  return {
    id,
    title: id,
    summary: '',
    transport_mode: 'car',
    stops,
    polyline: [],
    sections: [],
    cost_breakdown: { fuel: totalCost, toll: 0, parking: 0, admission: 0 },
    total_distance_km: 100,
    total_duration_min: durationMin,
    total_cost: totalCost,
    cost_per_person: Math.round(totalCost / people),
  }
}

function sum(weights: ReturnType<typeof resolveWeights>): number {
  return weights.cost + weights.time + weights.poi + weights.scenic
}

describe('resolveWeights', () => {
  it('uses the base weights (0.35 / 0.25 / 0.25 / 0.15) without preferences', () => {
    const weights = resolveWeights([])
    expect(weights.cost).toBeCloseTo(BASE_WEIGHTS.cost)
    expect(weights.time).toBeCloseTo(BASE_WEIGHTS.time)
    expect(weights.poi).toBeCloseTo(BASE_WEIGHTS.poi)
    expect(weights.scenic).toBeCloseTo(BASE_WEIGHTS.scenic)
  })

  it('raises the scenic weight when a category preference is selected', () => {
    const weights = resolveWeights(['onsen'])
    expect(weights.scenic).toBeGreaterThan(BASE_WEIGHTS.scenic)
    expect(weights.scenic).toBeCloseTo(0.3 / 1.15)
    expect(sum(weights)).toBeCloseTo(1)
  })

  it('raises the cost and time weights for cost / time preferences', () => {
    expect(resolveWeights(['cost']).cost).toBeGreaterThan(BASE_WEIGHTS.cost)
    expect(resolveWeights(['time']).time).toBeGreaterThan(BASE_WEIGHTS.time)
    expect(sum(resolveWeights(['cost', 'time', 'scenic']))).toBeCloseTo(1)
  })

  it('ignores unknown preference ids', () => {
    expect(resolveWeights(['unknown'])).toEqual(resolveWeights([]))
  })
})

describe('costScore / timeScore', () => {
  it('gives 1 to the cheapest / fastest route and less to others', () => {
    expect(costScore(5000, 5000)).toBe(1)
    expect(costScore(10000, 5000)).toBeCloseTo(0.5)
    expect(timeScore(120, 120, 1)).toBe(1)
    expect(timeScore(240, 120, 1)).toBeCloseTo(0.5)
  })

  it('penalizes driving more than 8 hours per day', () => {
    expect(timeScore(600, 600, 1)).toBeCloseTo(0.5)
    // 2日に分ければ1日5時間なのでペナルティなし
    expect(timeScore(600, 600, 2)).toBe(1)
  })
})

describe('poiScore', () => {
  it('returns a neutral score when no stop has a rating', () => {
    expect(poiScore([stop('A')])).toBe(0.5)
  })

  it('scores well-reviewed high ratings above sparse ones', () => {
    const popular = poiScore([stop('A', { rating: 4.6, user_rating_count: 5000 })])
    const sparse = poiScore([stop('B', { rating: 4.6, user_rating_count: 3 })])
    expect(popular).toBeCloseTo(0.92)
    expect(sparse).toBeLessThan(popular)
    expect(sparse).toBeGreaterThan(0.5)
  })

  it('ignores rest stops', () => {
    expect(
      poiScore([stop('SA', { is_rest_stop: true, rating: 1, user_rating_count: 5000 })])
    ).toBe(0.5)
  })
})

describe('scenicScore', () => {
  it('returns the ratio of stops matching the selected preferences', () => {
    const stops = [stop('城崎温泉'), stop('清水寺'), stop('嵐山渓谷')]
    expect(scenicScore(stops, ['onsen'])).toBeCloseTo(1 / 3)
    expect(scenicScore(stops, ['onsen', 'scenic'])).toBeCloseTo(2 / 3)
  })

  it('returns neutral without preferences and 0 for routes without stops', () => {
    expect(scenicScore([stop('清水寺')], [])).toBe(0.5)
    expect(scenicScore([], ['onsen'])).toBe(0)
  })
})

describe('scoreRoutes', () => {
  it('keeps the original order and attaches score and breakdown', () => {
    const routes = [route('a', 10000, 300), route('b', 5000, 200)]
    const scored = scoreRoutes(routes, { days: 1 })
    expect(scored.map((r) => r.id)).toEqual(['a', 'b'])
    expect(scored[1].score).toBeGreaterThan(scored[0].score ?? 0)
    expect(scored[1].score_breakdown).toMatchObject({ cost: 1, time: 1 })
  })

  it('applies the ×0.5 penalty to routes over budget', () => {
    const routes = [route('a', 10000, 200), route('b', 10000, 200)]
    const withBudget = scoreRoutes(routes, { days: 1, budget_per_person: 4000 })
    const without = scoreRoutes(routes, { days: 1 })
    expect(withBudget[0].score_breakdown?.over_budget).toBe(true)
    expect(withBudget[0].score).toBeCloseTo((without[0].score ?? 0) * 0.5, 2)
  })

  it('does not penalize routes within budget', () => {
    const scored = scoreRoutes([route('a', 8000, 200)], {
      days: 1,
      budget_per_person: 4000,
    })
    expect(scored[0].score_breakdown?.over_budget).toBe(false)
  })

  it('favors cheaper routes more when cost is prioritized', () => {
    const routes = [route('cheap', 5000, 400), route('fast', 9000, 200)]
    const neutral = scoreRoutes(routes, { days: 1 })
    const costFirst = scoreRoutes(routes, { days: 1, preferences: ['cost'] })
    const gap = (list: RouteCandidate[]) => (list[0].score ?? 0) - (list[1].score ?? 0)
    expect(gap(costFirst)).toBeGreaterThan(gap(neutral))
  })

  it('returns an empty list unchanged', () => {
    expect(scoreRoutes([], { days: 1 })).toEqual([])
  })
})

describe('rankRoutes', () => {
  it('returns the top 3 by score, keeping input order on ties', () => {
    const routes = [
      route('slow', 9000, 500),
      route('best', 5000, 200),
      route('mid', 7000, 300),
      route('tie-mid', 7000, 300),
    ]
    expect(rankRoutes(routes, { days: 1 }).map((r) => r.id)).toEqual([
      'best',
      'mid',
      'tie-mid',
    ])
  })
})
