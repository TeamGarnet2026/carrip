import { generateGeminiJson } from '@/lib/gemini/client'
import type { GeminiRoutePlansResponse, PoiPlace } from '@/lib/google/types'
import type { RouteGenerateRequest } from '@/lib/routes/types'

const ROUTE_VARIANTS = [
  { id: 'route-1', title: 'コスト重視ルート', focus: '移動距離と費用を抑え、効率よく回る' },
  { id: 'route-2', title: 'バランスタイプ', focus: '移動・観光・休憩のバランスが良い' },
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
- 各案は 2〜4 箇所の stop_place_ids を選ぶ
- 同じ POI を複数案で使い回してよい
- summary は日本語 80〜120 字で、その案の魅力を説明する
- 必ず次の JSON 形式のみ返す（余計なキーは不要）

{
  "routes": [
    {
      "id": "route-1",
      "title": "コスト重視ルート",
      "summary": "...",
      "stop_place_ids": ["places/..."]
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
  places: PoiPlace[]
): PoiPlace[] {
  const byId = new Map(places.map((p) => [p.id, p]))
  const stops: PoiPlace[] = []

  for (const id of plan.stop_place_ids) {
    const place = byId.get(id)
    if (place) stops.push(place)
  }

  if (stops.length > 0) return stops

  return places.slice(0, Math.min(3, places.length))
}
