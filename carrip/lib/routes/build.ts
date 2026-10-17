import { isGoogleCloudConfigured } from '@/lib/google/config'
import { geocodeAddress } from '@/lib/google/places'
import type { LatLng } from '@/lib/maps/route-corridor'
import { isNavitimeConfigured } from '@/lib/navitime/config'
import { PREFECTURE_META } from '@/lib/plan/prefecture-meta'
import { resolveFuelPriceForVehicle } from '@/lib/prices/fuel'
import {
  buildSingleRoute,
  routeStopToPoiPlace,
} from '@/lib/routes/build-route'
import {
  BALANCED_ROUTE_ID,
  buildDestinationStopsAsPlaces,
  buildDirectRouteSummary,
  COST_FOCUSED_ROUTE_ID,
  CUSTOM_ROUTE_ID,
  usesHighwayForRoute,
} from '@/lib/routes/cost-focused-plan'
import { collectDegradedReasons, type DegradedReason } from '@/lib/routes/degraded'
import { optimizeStopOrder } from '@/lib/routes/order-stops'
import type { RouteBuildInput } from '@/lib/routes/schema'
import { scoreRoutes } from '@/lib/routes/scoring'
import type {
  RouteGenerateRequest,
  RouteSearchResult,
  RouteStop,
} from '@/lib/routes/types'

export function isRouteGenerationConfigured(): boolean {
  return isGoogleCloudConfigured() && isNavitimeConfigured()
}

export async function resolveDestinationPoints(
  prefectures: string[]
): Promise<LatLng[]> {
  const destinations: LatLng[] = []

  for (const prefecture of prefectures) {
    // 都道府県はメタ座標を優先（Places 枠を消費しない）
    const meta = PREFECTURE_META[prefecture]
    if (meta) {
      destinations.push({ lat: meta.lat, lng: meta.lng })
      continue
    }
    const point = await geocodeAddress(prefecture)
    if (point) destinations.push(point)
  }

  return destinations
}

export function orderCustomStops(
  origin: LatLng,
  stops: RouteStop[],
  orderMode: RouteBuildInput['order_mode'],
  roundTrip: boolean
): RouteStop[] {
  if (orderMode === 'manual') return [...stops]
  return optimizeStopOrder(origin, stops, roundTrip)
}

export function buildCustomRouteSummary(
  request: RouteGenerateRequest,
  stops: RouteStop[]
): string {
  const names = stops.slice(0, 3).map((stop) => stop.name).join('、')
  const more = stops.length > 3 ? ` ほか${stops.length - 3}か所` : ''
  const road = usesHighwayForRoute(CUSTOM_ROUTE_ID, request)
    ? '高速道路を利用'
    : '一般道のみ'
  return `${request.origin} から ${names}${more} を巡るルートです（${road}）。`
}

/** 選んだ行き先を回るルートと、比較用の直行ルート2本（一般道・高速）を作る */
export async function buildRoutes(
  input: RouteBuildInput
): Promise<RouteSearchResult> {
  if (!isGoogleCloudConfigured()) {
    throw new Error('GOOGLE_CLOUD_API_KEY を .env.local に設定してください')
  }
  if (!isNavitimeConfigured()) {
    throw new Error(
      'RAPIDAPI_KEY / RAPIDAPI_HOST を .env.local に設定してください'
    )
  }

  const { request } = input
  const roundTrip = request.options?.round_trip === true

  const originLatLng = await geocodeAddress(request.origin)
  if (!originLatLng) {
    throw new Error(`出発地「${request.origin}」の位置情報を取得できませんでした`)
  }

  const destinations = await resolveDestinationPoints(request.prefecture)
  if (destinations.length === 0) {
    throw new Error(
      `${request.prefecture.join('、')} の位置情報を取得できませんでした`
    )
  }

  const fuelPrice = await resolveFuelPriceForVehicle(
    request.prefecture[0] ?? '東京都',
    request.vehicle
  )

  const customStops = orderCustomStops(
    originLatLng,
    input.stops,
    input.order_mode,
    roundTrip
  )
  const destinationStops = buildDestinationStopsAsPlaces(
    request.prefecture,
    destinations
  )

  const results = await Promise.all([
    buildSingleRoute({
      request,
      routeId: CUSTOM_ROUTE_ID,
      title: 'あなたのルート',
      summary: buildCustomRouteSummary(request, customStops),
      origin: originLatLng,
      pathStops: customStops.map(routeStopToPoiPlace),
      directRoute: false,
      fuelPrice,
      presetStops: new Map(customStops.map((stop) => [stop.place_id, stop])),
    }),
    buildSingleRoute({
      request,
      routeId: COST_FOCUSED_ROUTE_ID,
      title: 'コスト重視（一般道で直行）',
      summary: buildDirectRouteSummary(COST_FOCUSED_ROUTE_ID, request),
      origin: originLatLng,
      pathStops: destinationStops,
      directRoute: true,
      fuelPrice,
    }),
    buildSingleRoute({
      request,
      routeId: BALANCED_ROUTE_ID,
      title: 'バランス型（高速で直行）',
      summary: buildDirectRouteSummary(BALANCED_ROUTE_ID, request),
      origin: originLatLng,
      pathStops: destinationStops,
      directRoute: true,
      fuelPrice,
    }),
  ])

  const routeDegradedReasons = results
    .map((result) => result.degradedReason)
    .filter((reason): reason is DegradedReason => reason != null)

  const degraded_reasons = collectDegradedReasons(
    fuelPrice.degraded ? 'government_fuel' : null,
    routeDegradedReasons
  )

  return {
    generated_at: new Date().toISOString(),
    // 表示順は変えずにスコアだけ付ける（スコア順の表示は別チケット）
    routes: scoreRoutes(
      results.map((result) => result.route),
      request
    ),
    ...(degraded_reasons.length > 0
      ? { degraded: true, degraded_reasons }
      : {}),
  }
}
