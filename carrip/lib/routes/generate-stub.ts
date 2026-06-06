import type { RouteGenerateRequest, RouteSearchResult } from '@/lib/routes/types'

const ROUTE_TITLES = ['コスト重視ルート', 'バランスタイプ', '景観重視ルート']

/** 外部 API 連携前の仮ルート生成（テスト用） */
export function generateRouteSearchStub(
  request: RouteGenerateRequest
): RouteSearchResult {
  const baseCost = 12000 * request.days * request.people

  return {
    generated_at: new Date().toISOString(),
    routes: ROUTE_TITLES.map((title, index) => {
      const factor = [0.85, 1.0, 1.15][index]
      const totalCost = Math.round(baseCost * factor)
      const fuel = Math.round(totalCost * 0.35)
      const toll = Math.round(totalCost * 0.25)
      const parking = Math.round(totalCost * 0.15)
      const admission = totalCost - fuel - toll - parking

      return {
        id: `route-${index + 1}`,
        title,
        summary: `${request.prefecture.join('、')} 方面の${title}（スタブ）`,
        transport_mode: 'car' as const,
        stops: [],
        polyline: [],
        sections: [],
        cost_breakdown: { fuel, toll, parking, admission },
        total_distance_km: Math.round(180 * request.days * factor),
        total_duration_min: Math.round(240 * request.days * factor),
        total_cost: totalCost,
        cost_per_person: Math.round(totalCost / request.people),
      }
    }),
  }
}
