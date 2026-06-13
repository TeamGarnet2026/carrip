import type { GeminiRoutePlansResponse, PoiPlace } from '@/lib/google/types'
import type { RouteGenerateRequest } from '@/lib/routes/types'

function buildSummary(
  title: string,
  stops: PoiPlace[],
  request: RouteGenerateRequest
): string {
  const names = stops.map((s) => s.name).join('、')
  return `${request.origin} から ${request.prefecture.join('・')} 方面へ。${title}として ${names} を巡る ${request.days} 日のプランです。`
}

export function buildFallbackRoutePlans(
  request: RouteGenerateRequest,
  places: PoiPlace[]
): GeminiRoutePlansResponse {
  const sorted = [...places].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

  const variants = [
    { id: 'route-1', title: 'コスト重視ルート', count: 2 },
    { id: 'route-2', title: 'バランスタイプ', count: 3 },
    { id: 'route-3', title: '景観重視ルート', count: 4 },
  ] as const

  return {
    routes: variants.map((variant) => {
      const stops = sorted.slice(0, Math.min(variant.count, sorted.length))
      return {
        id: variant.id,
        title: variant.title,
        summary: buildSummary(variant.title, stops, request),
        stop_place_ids: stops.map((s) => s.id),
      }
    }),
  }
}
