import { generateGeminiJson } from '@/lib/gemini/client'
import type { GeminiRoutePlansResponse, PoiPlace } from '@/lib/google/types'
import {
  orderStopsTowardDestinations,
  selectPlacesNearDestination,
  type LatLng,
} from '@/lib/maps/route-corridor'
import { isDirectRoute } from '@/lib/routes/cost-focused-plan'
import type { RouteGenerateRequest } from '@/lib/routes/types'

const ROUTE_VARIANTS = [
  { id: 'route-1', title: 'コスト重視ルート', focus: '立ち寄りなしで目的地まで直行し、高速料金と所要時間を最小化する' },
  { id: 'route-2', title: 'バランスタイプ', focus: '高速道路のみ・立ち寄りなしで目的地まで直行し、所要時間とのバランスを取る' },
  { id: 'route-3', title: '景観重視ルート', focus: '評価の高い人気スポットを優先する' },
] as const

function buildPrompt(
  request: RouteGenerateRequest,
  places: PoiPlace[]
): string {
  const poiList = places
    .map(
      (p) =>
        `- id: ${p.id}, name: ${p.name}, rating: ${p.rating ?? 'N/A'}, address: ${p.address}`
    )
    .join('\n')

  const variants = ROUTE_VARIANTS.map(
    (v) => `- ${v.id}: ${v.title}（${v.focus}）`
  ).join('\n')

  return `あなたは日本のドライブ旅行プランナーです。
以下の条件と観光地リストから、ルート候補を3案作成してください。

## 旅行条件
- 出発地: ${request.origin}
- 訪問都道府県: ${request.prefecture.join('、')}
- 出発日: ${request.departure_date}
- 日数: ${request.days}日
- 人数: ${request.people}人
- 優先軸: ${request.preferences?.join('、') ?? 'なし'}

## 作成する3案
${variants}

## 観光地候補（この id のみ使用可）
${poiList}

## ルール
- route-1（コスト重視）: stop_place_ids は空配列 [] とする（観光地なし・目的地まで直行）
- route-2（バランスタイプ）: stop_place_ids は空配列 [] とする（観光地なし・高速道路のみで直行）
- route-3（景観重視）: 2〜4 箇所の stop_place_ids を選ぶ
- route-3 は訪問先都道府県の周辺エリアにある POI のみ選ぶ（出発地付近やルート途中は不可）
- route-3 は出発地から目的地方向へ近づく順に並べる（目的地到着後に出発地方向へ戻らない）
- 同じ POI を複数案で使い回してよい
- summary は日本語 80〜120 字で、その案の魅力を説明する
- 必ず次の JSON 形式のみ返す（余計なキーは不要）

{
  "routes": [
    {
      "id": "route-1",
      "title": "コスト重視ルート",
      "summary": "...",
      "stop_place_ids": []
    }
  ]
}`
}

export async function planRoutesWithGemini(
  request: RouteGenerateRequest,
  places: PoiPlace[]
): Promise<GeminiRoutePlansResponse> {
  if (places.length === 0) {
    throw new Error('観光スポットが見つかりませんでした')
  }

  const result = await generateGeminiJson<GeminiRoutePlansResponse>(
    buildPrompt(request, places)
  )

  if (!result.routes?.length) {
    throw new Error('Gemini がルート案を生成できませんでした')
  }

  return result
}

export function resolveStopsFromPlan(
  plan: GeminiRoutePlansResponse['routes'][number],
  places: PoiPlace[],
  destinations: LatLng[] = [],
  origin?: LatLng
): PoiPlace[] {
  if (isDirectRoute(plan.id)) {
    return []
  }

  const byId = new Map(places.map((p) => [p.id, p]))
  const stops: PoiPlace[] = []

  for (const id of plan.stop_place_ids) {
    const place = byId.get(id)
    if (place) stops.push(place)
  }

  let resolved =
    stops.length > 0
      ? stops
      : places.slice(0, Math.min(3, places.length))

  if (destinations.length > 0) {
    const filtered = selectPlacesNearDestination(resolved, destinations)
    if (filtered.length > 0) {
      resolved = filtered
    }
  }

  if (origin && destinations.length > 0) {
    resolved = orderStopsTowardDestinations(origin, destinations, resolved)
  }

  return resolved.slice(0, 4)
}
