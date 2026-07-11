export type ApiTestStatus = 'idle' | 'running' | 'success' | 'warning' | 'error' | 'skipped'

export type ApiTestCategory =
  | 'health'
  | 'external'
  | 'route'
  | 'route-step'
  | 'auth'

export type ApiTestDefinition = {
  id: string
  label: string
  description: string
  category: ApiTestCategory
  method: string
  endpoint: string
  requiresAuth?: boolean
  heavy?: boolean
  run: (context: ApiTestContext) => Promise<unknown>
}

export type ApiTestContext = {
  lastGeneratedRoute: unknown | null
  lastTripId: string | null
  setLastGeneratedRoute: (value: unknown) => void
  setLastTripId: (value: string) => void
}

export type ApiTestResult = {
  status: ApiTestStatus
  durationMs?: number
  data?: unknown
  error?: string
  skippedReason?: string
}

function departureDateIso(): string {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().slice(0, 10)
}

const SAMPLE_ROUTE_GENERATE_REQUEST = {
  origin: '京都駅',
  prefecture: ['京都府'],
  departure_date: departureDateIso(),
  days: 1,
  people: 2,
  vehicle: { type: 'compact' },
  preferences: ['scenic'],
  options: {
    use_highway: true,
    etc_card: true,
    max_drive_min: 90,
  },
}

const SAMPLE_TOURIST_STOPS = [
  {
    id: 'ChIJB_vchdMIAWARujTEUIZlr2I',
    name: '清水寺',
    lat: 34.9949,
    lng: 135.785,
    category: 'tourist',
  },
]

async function fetchJson(
  input: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const response = await fetch(input, init)
  let data: unknown = null

  try {
    data = await response.json()
  } catch {
    data = { message: 'JSON レスポンスではありません' }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `HTTP ${response.status}`
    throw new Error(message)
  }

  return { ok: response.ok, status: response.status, data }
}

const SAMPLE_TRIP_ROUTE = {
  id: 'route-test-1',
  title: 'APIテスト用ルート',
  summary: '手動テストページから保存したサンプル',
  transport_mode: 'car' as const,
  stops: [
    {
      place_id: 'ChIJB_vchdMIAWARujTEUIZlr2I',
      name: '清水寺',
      address: '京都府京都市東山区',
      lat: 34.9949,
      lng: 135.785,
    },
  ],
  polyline: [
    { lat: 35.0116, lng: 135.7681 },
    { lat: 34.9949, lng: 135.785 },
  ],
  sections: [{ type: 'move', name: '走行', duration_min: 30, distance_km: 8 }],
  cost_breakdown: { fuel: 500, toll: 0, parking: 300, admission: 0 },
  total_distance_km: 8,
  total_duration_min: 30,
  total_cost: 800,
  cost_per_person: 200,
}

export const API_TEST_DEFINITIONS: ApiTestDefinition[] = [
  {
    id: 'health-google-maps',
    label: 'Google Maps ヘルスチェック',
    description:
      'Places API と Maps JavaScript API の疎通確認（Static Maps は参考表示のみ・未使用）',
    category: 'health',
    method: 'GET',
    endpoint: '/api/health/google-maps',
    run: async () => fetchJson('/api/health/google-maps'),
  },
  {
    id: 'health-gemini',
    label: 'Gemini API キー疎通チェック',
    description:
      'GEMINI_API_KEY が有効か最小リクエストで確認（429 クォータ超過もここで判別）',
    category: 'health',
    method: 'GET',
    endpoint: '/api/health/gemini',
    run: async () => {
      const result = await fetchJson('/api/health/gemini')
      const data = result.data as {
        ok?: boolean
        reason?: string
        message?: string
        fix_steps?: string[]
      }

      if (data.reason === 'quota_exceeded') {
        return {
          warning: true,
          reason: data.message,
          fix_steps: data.fix_steps,
          ...data,
        }
      }

      if (data.ok === false) {
        throw new Error(data.message ?? 'Gemini API は利用できません')
      }

      return result
    },
  },
  {
    id: 'health-redis',
    label: 'Redis ヘルスチェック',
    description: 'Upstash Redis 接続確認（外部API消費なし）',
    category: 'health',
    method: 'GET',
    endpoint: '/api/health/redis',
    run: async () => fetchJson('/api/health/redis'),
  },
  {
    id: 'prices-toll',
    label: '高速料金取得',
    description: 'NAVITIME Route(car) で京都→清水寺付近の料金を取得',
    category: 'external',
    method: 'GET',
    endpoint: '/api/prices/toll',
    run: async () =>
      fetchJson(
        '/api/prices/toll?start=35.0116,135.7681&goal=34.9949,135.7850&vehicle_type=compact&use_highway=true&etc_card=true'
      ),
  },
  {
    id: 'pois-search-tourist',
    label: 'POI検索（観光地）',
    description: 'Google Places で観光 POI を検索',
    category: 'external',
    method: 'GET',
    endpoint: '/api/pois/search',
    requiresAuth: true,
    run: async () =>
      fetchJson(
        '/api/pois/search?q=金閣寺&category=tourist&prefecture=京都府'
      ),
  },
  {
    id: 'pois-search-rest-area',
    label: 'POI検索（道の駅）',
    description: 'Google Places で道の駅を検索',
    category: 'external',
    method: 'GET',
    endpoint: '/api/pois/search',
    requiresAuth: true,
    run: async () =>
      fetchJson('/api/pois/search?q=岐阜&category=rest_area'),
  },
  {
    id: 'pois-search-service-area',
    label: 'POI検索（サービスエリア）',
    description: 'Google Places で SA を検索',
    category: 'external',
    method: 'GET',
    endpoint: '/api/pois/search',
    requiresAuth: true,
    run: async () =>
      fetchJson('/api/pois/search?q=浜松&category=service_area'),
  },
  {
    id: 'dev-geocode',
    label: 'ジオコーディング',
    description: 'Google Geocoding で住所→座標を取得（Places API 1回）',
    category: 'route-step',
    method: 'GET',
    endpoint: '/api/dev/geocode?q=京都駅',
    run: async () => fetchJson('/api/dev/geocode?q=京都駅'),
  },
  {
    id: 'dev-destination-pois',
    label: '目的地周辺 POI 検索',
    description:
      '観光 POI を検索し、目的地半径35km以内のみに絞り込み（Places API）',
    category: 'route-step',
    method: 'POST',
    endpoint: '/api/dev/destination-pois',
    run: async () =>
      fetchJson('/api/dev/destination-pois', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefecture: ['京都府'],
          preferences: ['scenic'],
        }),
      }),
  },
  {
    id: 'dev-gemini-plan',
    label: 'Gemini ルート案生成',
    description:
      '目的地周辺 POI から Gemini で3案生成（Places + Gemini API）',
    category: 'route-step',
    method: 'POST',
    endpoint: '/api/dev/gemini-plan',
    heavy: true,
    run: async () =>
      fetchJson('/api/dev/gemini-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SAMPLE_ROUTE_GENERATE_REQUEST),
      }),
  },
  {
    id: 'dev-navitime-route',
    label: 'NAVITIME ルート取得',
    description: '立ち寄り地点付きの走行ルート・料金を取得（NAVITIME API）',
    category: 'route-step',
    method: 'POST',
    endpoint: '/api/dev/navitime-route',
    heavy: true,
    run: async () =>
      fetchJson('/api/dev/navitime-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...SAMPLE_ROUTE_GENERATE_REQUEST,
          stops: SAMPLE_TOURIST_STOPS,
        }),
      }),
  },
  {
    id: 'dev-driver-change-highway',
    label: '運転交代地点（高速・SA/PA）',
    description:
      '長時間走行区間に SA/PA を自動挿入（Places API・高速利用時）',
    category: 'route-step',
    method: 'POST',
    endpoint: '/api/dev/driver-change',
    run: async () =>
      fetchJson('/api/dev/driver-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: 35.0116, lng: 135.7681 },
          stops: SAMPLE_TOURIST_STOPS.map((stop) => ({
            ...stop,
            address: stop.name,
          })),
          sections: [
            { type: 'move', name: '名神高速', duration_min: 150, distance_km: 120 },
          ],
          max_drive_min: 90,
          use_highway: true,
        }),
      }),
  },
  {
    id: 'dev-driver-change-local',
    label: '運転交代地点（一般道・コンビニ）',
    description:
      '長時間走行区間にコンビニを自動挿入（Places API・高速未利用時）',
    category: 'route-step',
    method: 'POST',
    endpoint: '/api/dev/driver-change',
    run: async () =>
      fetchJson('/api/dev/driver-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: 35.0116, lng: 135.7681 },
          stops: SAMPLE_TOURIST_STOPS.map((stop) => ({
            ...stop,
            address: stop.name,
          })),
          sections: [
            { type: 'move', name: '一般道', duration_min: 130, distance_km: 80 },
          ],
          max_drive_min: 90,
          use_highway: false,
        }),
      }),
  },
  {
    id: 'routes-recalculate-stub',
    label: 'ルート再計算（スタブ）',
    description:
      '立ち寄り編集後の費用再計算を外部 API なしで確認（直線距離ベース概算）',
    category: 'route',
    method: 'POST',
    endpoint: '/api/routes/recalculate?mode=stub',
    run: async () =>
      fetchJson('/api/routes/recalculate?mode=stub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: SAMPLE_ROUTE_GENERATE_REQUEST,
          route_id: 'route-1',
          stops: [
            {
              place_id: 'stub-kiyomizu',
              name: 'サンプル観光地A',
              address: 'サンプル住所A',
              lat: 34.9949,
              lng: 135.785,
              stay_minutes: 90,
              parking_yen: 600,
              parking_source: 'manual',
              admission_yen_per_person: 400,
            },
            {
              place_id: 'stub-kinkaku',
              name: 'サンプル観光地B',
              address: 'サンプル住所B',
              lat: 35.0394,
              lng: 135.7292,
              stay_minutes: 60,
              parking_yen: 300,
              parking_source: 'category_default',
              admission_yen_per_person: 500,
            },
          ],
        }),
      }),
  },
  {
    id: 'routes-generate-stub',
    label: 'ルート生成（スタブ）',
    description: '外部 API を使わずダミー3案を返す（API 消費なし）',
    category: 'route',
    method: 'POST',
    endpoint: '/api/routes/generate?mode=stub',
    run: async (context) => {
      const result = await fetchJson('/api/routes/generate?mode=stub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SAMPLE_ROUTE_GENERATE_REQUEST),
      })
      context.setLastGeneratedRoute(result.data)
      return result
    },
  },
  {
    id: 'routes-generate',
    label: 'ルート生成（フル）',
    description:
      'Places + Gemini + NAVITIME + 駐車料 + 入場料。API 消費が大きいので単体実行推奨',
    category: 'route',
    method: 'POST',
    endpoint: '/api/routes/generate',
    heavy: true,
    run: async (context) => {
      const result = await fetchJson('/api/routes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SAMPLE_ROUTE_GENERATE_REQUEST),
      })
      context.setLastGeneratedRoute(result.data)
      return result
    },
  },
  {
    id: 'trips-list',
    label: '旅行プラン一覧',
    description: 'GET /api/trips — ログインユーザーの保存済みプラン',
    category: 'auth',
    method: 'GET',
    endpoint: '/api/trips',
    requiresAuth: true,
    run: async () => fetchJson('/api/trips'),
  },
  {
    id: 'trips-create',
    label: '旅行プラン保存',
    description:
      'POST /api/trips — 直前のルート生成結果があればそれを保存、なければサンプル',
    category: 'auth',
    method: 'POST',
    endpoint: '/api/trips',
    requiresAuth: true,
    run: async (context) => {
      const generated = context.lastGeneratedRoute as {
        routes?: Array<(typeof SAMPLE_TRIP_ROUTE)>
      } | null
      const route = generated?.routes?.[0] ?? SAMPLE_TRIP_ROUTE

      const result = await fetchJson('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: '京都駅',
          prefecture: ['京都府'],
          departure_date: departureDateIso(),
          days: 1,
          people: 2,
          vehicle: { type: 'compact' },
          route,
        }),
      })

      const tripId =
        typeof result.data === 'object' &&
        result.data !== null &&
        'trip' in result.data &&
        typeof (result.data as { trip: { id?: string } }).trip?.id === 'string'
          ? (result.data as { trip: { id: string } }).trip.id
          : null

      if (tripId) {
        context.setLastTripId(tripId)
      }

      return result
    },
  },
  {
    id: 'trips-detail',
    label: '旅行プラン詳細',
    description:
      'GET /api/trips/:id — 直前の保存 ID を使用。未保存ならスキップ',
    category: 'auth',
    method: 'GET',
    endpoint: '/api/trips/:id',
    requiresAuth: true,
    run: async (context) => {
      if (!context.lastTripId) {
        return {
          skipped: true,
          reason: '先に「旅行プラン保存」を成功させるか、一覧から ID を確認してください',
        }
      }

      return fetchJson(`/api/trips/${context.lastTripId}`)
    },
  },
]

export const API_TEST_CATEGORY_LABELS: Record<ApiTestCategory, string> = {
  health: 'ヘルスチェック',
  external: '外部API連携',
  route: 'ルート生成',
  'route-step': 'ルート生成（ステップ別）',
  auth: '認証必須',
}
