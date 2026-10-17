import type {
  RouteCandidate,
  RouteGenerateRequest,
  RouteStop,
} from '@/lib/routes/types'

export type { RouteScoreBreakdown } from '@/lib/routes/types'

/**
 * ルートスコアリング（要件定義書 4-7）
 * score = w_cost×cost_score + w_time×time_score + w_poi×poi_score + w_scenic×scenic_score
 */

export type ScoreWeights = {
  cost: number
  time: number
  poi: number
  scenic: number
}

export const BASE_WEIGHTS: ScoreWeights = {
  cost: 0.35,
  time: 0.25,
  poi: 0.25,
  scenic: 0.15,
}

/** 優先軸を選んだときに引き上げる重み */
const BOOSTED_WEIGHTS = { cost: 0.5, time: 0.4, scenic: 0.3 } as const

/** 予算超過ルートのペナルティ（加重和に掛ける） */
export const OVER_BUDGET_PENALTY = 0.5

/** 1日の走行が8時間を超えると時間スコアに掛けるペナルティ */
export const LONG_DRIVE_PENALTY = 0.5
const LONG_DRIVE_MINUTES_PER_DAY = 8 * 60

/** POI 評価・優先軸が判断できないときの中立値 */
const NEUTRAL_SCORE = 0.5

/** レビュー件数がこの数に達したら評価を満額で信頼する */
const FULL_CONFIDENCE_REVIEWS = 1000

const COST_PREFERENCES = new Set(['cost'])
const TIME_PREFERENCES = new Set(['time'])

/** 優先軸ごとに、立ち寄り地点の名前・カテゴリに含まれていれば一致とみなす語 */
const PREFERENCE_KEYWORDS: Record<string, string[]> = {
  scenic: ['景観', '自然', '公園', '庭園', '渓谷', '湖', '滝', '海岸', 'park', 'garden'],
  onsen: ['温泉', '湯', 'spa', 'onsen'],
  view: ['絶景', '展望', '眺望', '山', '岬', 'observation'],
  hidden: ['穴場', '秘境', '隠れ'],
  gourmet: ['グルメ', '名物', '市場', '食堂', '酒蔵', 'restaurant', 'market'],
  experience: ['体験', '工房', '博物館', '美術館', '水族館', 'museum', 'aquarium'],
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** 優先軸に応じて重みを決め、合計が1になるよう正規化する */
export function resolveWeights(preferences: string[] = []): ScoreWeights {
  const selected = new Set(preferences)
  const weights: ScoreWeights = { ...BASE_WEIGHTS }

  if ([...selected].some((id) => COST_PREFERENCES.has(id))) {
    weights.cost = BOOSTED_WEIGHTS.cost
  }
  if ([...selected].some((id) => TIME_PREFERENCES.has(id))) {
    weights.time = BOOSTED_WEIGHTS.time
  }
  if ([...selected].some((id) => id in PREFERENCE_KEYWORDS)) {
    weights.scenic = BOOSTED_WEIGHTS.scenic
  }

  const total = weights.cost + weights.time + weights.poi + weights.scenic
  return {
    cost: weights.cost / total,
    time: weights.time / total,
    poi: weights.poi / total,
    scenic: weights.scenic / total,
  }
}

/** 候補の中で最も安いルートを1として、費用に反比例させる */
export function costScore(totalCost: number, minCost: number): number {
  if (totalCost <= 0) return 1
  return clamp01(minCost / totalCost)
}

/** 候補の中で最も短いルートを1として、所要時間に反比例させる。1日8時間超はペナルティ */
export function timeScore(
  durationMin: number,
  minDurationMin: number,
  days: number
): number {
  const base = durationMin <= 0 ? 1 : clamp01(minDurationMin / durationMin)
  const perDay = durationMin / Math.max(1, days)
  return perDay > LONG_DRIVE_MINUTES_PER_DAY ? base * LONG_DRIVE_PENALTY : base
}

function touristStops(stops: RouteStop[]): RouteStop[] {
  return stops.filter((stop) => !stop.is_rest_stop)
}

/** Google 評価（5点満点）をレビュー件数の信頼度で補正した平均 */
export function poiScore(stops: RouteStop[]): number {
  const rated = touristStops(stops).filter((stop) => stop.rating != null)
  if (rated.length === 0) return NEUTRAL_SCORE

  const total = rated.reduce((sum, stop) => {
    const rating = clamp01((stop.rating ?? 0) / 5)
    const reviews = Math.max(0, stop.user_rating_count ?? 0)
    const confidence = clamp01(
      Math.log10(reviews + 1) / Math.log10(FULL_CONFIDENCE_REVIEWS + 1)
    )
    // 件数が少ない評価は中立値に寄せる
    return sum + (rating * confidence + NEUTRAL_SCORE * (1 - confidence))
  }, 0)
  return total / rated.length
}

/** 立ち寄り地点のうち、選んだ優先軸に一致する地点の割合 */
export function scenicScore(stops: RouteStop[], preferences: string[] = []): number {
  const keywords = preferences.flatMap((id) => PREFERENCE_KEYWORDS[id] ?? [])
  if (keywords.length === 0) return NEUTRAL_SCORE

  const candidates = touristStops(stops)
  if (candidates.length === 0) return 0

  const matched = candidates.filter((stop) => {
    const text = `${stop.name} ${stop.category ?? ''}`.toLowerCase()
    return keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  })
  return matched.length / candidates.length
}

/** 各ルートにスコア（0〜1）を付ける。並び順は変えない */
export function scoreRoutes(
  routes: RouteCandidate[],
  request: Pick<RouteGenerateRequest, 'budget_per_person' | 'preferences' | 'days'>
): RouteCandidate[] {
  if (routes.length === 0) return routes

  const weights = resolveWeights(request.preferences)
  const minCost = Math.min(...routes.map((route) => route.total_cost))
  const minDuration = Math.min(...routes.map((route) => route.total_duration_min))

  return routes.map((route) => {
    const breakdown = {
      cost: costScore(route.total_cost, minCost),
      time: timeScore(route.total_duration_min, minDuration, request.days),
      poi: poiScore(route.stops),
      scenic: scenicScore(route.stops, request.preferences),
    }
    const weighted =
      weights.cost * breakdown.cost +
      weights.time * breakdown.time +
      weights.poi * breakdown.poi +
      weights.scenic * breakdown.scenic
    const overBudget =
      request.budget_per_person != null &&
      route.cost_per_person > request.budget_per_person
    const score = overBudget ? weighted * OVER_BUDGET_PENALTY : weighted

    return {
      ...route,
      score: round3(score),
      score_breakdown: {
        cost: round3(breakdown.cost),
        time: round3(breakdown.time),
        poi: round3(breakdown.poi),
        scenic: round3(breakdown.scenic),
        weighted: round3(weighted),
        over_budget: overBudget,
      },
    }
  })
}

/** スコアの高い順に並べ、上位 limit 件を返す */
export function rankRoutes(
  routes: RouteCandidate[],
  request: Pick<RouteGenerateRequest, 'budget_per_person' | 'preferences' | 'days'>,
  limit = 3
): RouteCandidate[] {
  return scoreRoutes(routes, request)
    .map((route, index) => ({ route, index }))
    .sort((a, b) => (b.route.score ?? 0) - (a.route.score ?? 0) || a.index - b.index)
    .slice(0, limit)
    .map(({ route }) => route)
}
