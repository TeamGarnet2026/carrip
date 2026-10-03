import {
  BALANCED_ROUTE_ID,
  COST_FOCUSED_ROUTE_ID,
  CUSTOM_ROUTE_ID,
} from '@/lib/routes/cost-focused-plan'
import type {
  RouteGenerateRequest,
  RouteSearchResult,
  RouteStop,
} from '@/lib/routes/types'

const ROUTE_VARIANTS = [
  { id: CUSTOM_ROUTE_ID, title: 'あなたのルート' },
  { id: COST_FOCUSED_ROUTE_ID, title: 'コスト重視（一般道で直行）' },
  { id: BALANCED_ROUTE_ID, title: 'バランス型（高速で直行）' },
] as const

const SAMPLE_STOPS: RouteStop[] = [
  {
    place_id: 'stub-kiyomizu',
    name: 'サンプル観光地A（清水寺相当）',
    address: 'サンプル住所A',
    lat: 34.9949,
    lng: 135.785,
    category: 'tourist',
    is_rest_stop: false,
    stay_minutes: 90,
    parking_yen: 600,
    parking_source: 'category_default',
    admission_yen_per_person: 400,
  },
  {
    place_id: 'stub-kinkaku',
    name: 'サンプル観光地B（金閣寺相当）',
    address: 'サンプル住所B',
    lat: 35.0394,
    lng: 135.7292,
    category: 'tourist',
    is_rest_stop: false,
    stay_minutes: 60,
    parking_yen: 300,
    parking_source: 'category_default',
    admission_yen_per_person: 500,
  },
  {
    place_id: 'stub-arashiyama',
    name: 'サンプル観光地C（嵐山相当）',
    address: 'サンプル住所C',
    lat: 35.0094,
    lng: 135.6668,
    category: 'tourist',
    is_rest_stop: false,
    stay_minutes: 120,
    parking_yen: 1000,
    parking_source: 'category_default',
    admission_yen_per_person: 0,
  },
]

function withStubCosts(stop: RouteStop, index: number): RouteStop {
  const sample = SAMPLE_STOPS[index % SAMPLE_STOPS.length]
  return {
    ...stop,
    is_rest_stop: stop.is_rest_stop ?? false,
    stay_minutes: stop.stay_minutes ?? sample.stay_minutes,
    parking_yen: stop.parking_yen ?? sample.parking_yen,
    parking_source: stop.parking_source ?? 'category_default',
    admission_yen_per_person:
      stop.admission_yen_per_person ?? sample.admission_yen_per_person,
  }
}

/** 外部 API を使わない仮ルート作成（テスト用）。選んだ行き先がなければサンプル地点を使う */
export function buildRoutesStub(input: {
  request: RouteGenerateRequest
  stops?: RouteStop[]
}): RouteSearchResult {
  const { request } = input
  const customStops =
    input.stops && input.stops.length > 0
      ? input.stops.map(withStubCosts)
      : SAMPLE_STOPS

  return {
    generated_at: new Date().toISOString(),
    routes: ROUTE_VARIANTS.map(({ id, title }, index) => {
      const factor = [1.15, 0.85, 1.0][index]
      const directRoute = id !== CUSTOM_ROUTE_ID
      const stops = directRoute ? [] : customStops
      const toll = Math.round(12000 * request.days * factor * 0.25)
      // 直行プランも走行距離は発生するため、観光地なしでも燃料費は計算する
      const fuel = Math.round(12000 * request.days * factor * 0.35)
      const parking = directRoute
        ? 0
        : stops.reduce((total, stop) => total + (stop.parking_yen ?? 0), 0)
      const admission = directRoute
        ? 0
        : stops.reduce(
            (total, stop) => total + (stop.admission_yen_per_person ?? 0),
            0
          ) * request.people
      const totalCost = fuel + toll + parking + admission
      const originPoint = { lat: 35.0116, lng: 135.7681 }
      const destinationPoint = { lat: 35.0116, lng: 135.9812 }
      const stopPoints = stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))
      const roundTrip = request.options?.round_trip === true
      const polyline = directRoute
        ? roundTrip
          ? [originPoint, destinationPoint, originPoint]
          : [originPoint, destinationPoint]
        : roundTrip
          ? [originPoint, ...stopPoints, originPoint]
          : stopPoints

      return {
        id,
        title,
        summary: directRoute
          ? `${request.prefecture.join('、')} まで直行（スタブ）`
          : `${request.prefecture.join('、')} 方面の${title}（スタブ）`,
        transport_mode: 'car' as const,
        stops,
        polyline,
        sections: [
          {
            type: 'move',
            name: '概算走行（スタブ）',
            distance_km: Math.round(180 * request.days * factor),
            duration_min: Math.round(240 * request.days * factor),
          },
        ],
        cost_breakdown: { fuel, toll, parking, admission },
        cost_sources: {
          fuel: 'fixed_fallback' as const,
          toll: 'estimate' as const,
          parking: directRoute ? undefined : ('category_default' as const),
          admission: directRoute ? undefined : ('estimate' as const),
        },
        total_distance_km: Math.round(180 * request.days * factor),
        total_duration_min: Math.round(240 * request.days * factor),
        total_cost: totalCost,
        cost_per_person: Math.round(totalCost / request.people),
        round_trip: roundTrip,
      }
    }),
  }
}
