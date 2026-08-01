import type {
  RouteGenerateRequest,
  RouteSearchResult,
  RouteStop,
} from '@/lib/routes/types'

const ROUTE_TITLES = ['コスト重視ルート', 'バランスタイプ', '景観重視ルート']

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

/** 外部 API 連携前の仮ルート生成（テスト用） */
export function generateRouteSearchStub(
  request: RouteGenerateRequest
): RouteSearchResult {
  return {
    generated_at: new Date().toISOString(),
    routes: ROUTE_TITLES.map((title, index) => {
      const factor = [0.85, 1.0, 1.15][index]
      const directRoute = index === 0 || index === 1
      const stops = directRoute
        ? []
        : SAMPLE_STOPS.slice(0, index + 2 > 3 ? 3 : index + 2)
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
        id: `route-${index + 1}`,
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
