import type {
  CostBreakdown,
  CostSources,
  ParkingSource,
  RouteCandidate,
  RouteStop,
} from '@/lib/routes/types'

export type CostConfidence = 'high' | 'medium' | 'low'

export type CostSourceDisplay = {
  label: string
  confidence: CostConfidence
}

/** 費用4項目それぞれのデータソース表示（ラベル + 信頼度） */
export function describeCostSources(sources: CostSources | undefined): {
  fuel: CostSourceDisplay
  toll: CostSourceDisplay
  parking: CostSourceDisplay
  admission: CostSourceDisplay
} {
  return {
    fuel: describeFuelSource(sources?.fuel),
    toll: describeTollSource(sources?.toll),
    parking: describeParkingSource(sources?.parking),
    admission: describeAdmissionSource(sources?.admission),
  }
}

function describeFuelSource(
  source: CostSources['fuel']
): CostSourceDisplay {
  switch (source) {
    case 'enecho_db':
      return { label: '資源エネルギー庁・都道府県単価', confidence: 'high' }
    case 'enecho_national':
      return { label: '資源エネルギー庁・全国平均', confidence: 'medium' }
    case 'government_api':
      return { label: '政府API単価', confidence: 'high' }
    case 'monthly_fallback':
      return { label: '月次平均単価', confidence: 'medium' }
    case 'fixed_fallback':
      return { label: '固定単価（概算）', confidence: 'low' }
    default:
      return { label: '距離×燃費で計算', confidence: 'medium' }
  }
}

function describeTollSource(
  source: CostSources['toll']
): CostSourceDisplay {
  switch (source) {
    case 'navitime':
      return { label: 'NAVITIME実額', confidence: 'high' }
    case 'estimate':
      return { label: '取得失敗・要確認', confidence: 'low' }
    default:
      return { label: '不明', confidence: 'low' }
  }
}

function describeParkingSource(
  source: CostSources['parking']
): CostSourceDisplay {
  switch (source) {
    case 'manual':
      return { label: '手動入力', confidence: 'high' }
    case 'places':
      return { label: 'Google Places', confidence: 'medium' }
    case 'free':
      return { label: '無料', confidence: 'high' }
    case 'category_default':
    case 'estimate':
      return { label: '概算・要確認', confidence: 'low' }
    default:
      return { label: '概算・要確認', confidence: 'low' }
  }
}

function describeAdmissionSource(
  source: CostSources['admission']
): CostSourceDisplay {
  switch (source) {
    case 'places':
      return { label: 'Google Places（不明分は0円）', confidence: 'medium' }
    case 'estimate':
      return { label: '概算・要確認', confidence: 'low' }
    default:
      return { label: '不明', confidence: 'low' }
  }
}

/** 立ち寄り地点ごとの駐車ソースを1つに集約（低信頼度を優先して表面化） */
export function aggregateParkingSource(
  stops: Array<Pick<RouteStop, 'parking_source' | 'parking_yen'>>
): ParkingSource {
  const sources = stops
    .map((stop) => stop.parking_source)
    .filter((source): source is ParkingSource => source != null)

  if (sources.length === 0) return 'estimate'
  if (sources.some((s) => s === 'estimate' || s === 'category_default')) {
    return 'category_default'
  }
  if (sources.some((s) => s === 'manual')) return 'manual'
  if (sources.every((s) => s === 'free')) return 'free'
  return 'places'
}

export function sumStopParking(stops: RouteStop[]): number {
  return stops.reduce((total, stop) => total + (stop.parking_yen ?? 0), 0)
}

export function sumStopAdmissionPerPerson(stops: RouteStop[]): number {
  return stops.reduce(
    (total, stop) => total + (stop.admission_yen_per_person ?? 0),
    0
  )
}

/**
 * 駐車料・入場料の変更をルートへローカル反映する（外部API不要）。
 * 燃料・高速はルート形状が変わらない限り据え置き。
 */
export function recalculateRouteCostsLocally(
  route: RouteCandidate,
  stops: RouteStop[],
  people: number
): RouteCandidate {
  const parking = sumStopParking(stops)
  const admission = sumStopAdmissionPerPerson(stops) * people

  const costBreakdown: CostBreakdown = {
    ...route.cost_breakdown,
    parking,
    admission,
  }
  const totalCost =
    costBreakdown.fuel +
    costBreakdown.toll +
    costBreakdown.parking +
    costBreakdown.admission

  return {
    ...route,
    stops,
    cost_breakdown: costBreakdown,
    cost_sources: {
      ...route.cost_sources,
      parking: aggregateParkingSource(stops),
    },
    total_cost: totalCost,
    cost_per_person: Math.round(totalCost / Math.max(1, people)),
  }
}
