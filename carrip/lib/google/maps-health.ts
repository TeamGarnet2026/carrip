import { getGoogleCloudApiKey, isGoogleCloudConfigured } from '@/lib/google/config'

export type GoogleMapsHealthCheck = {
  ok: boolean
  places_api: 'ok' | 'error' | 'skipped'
  maps_javascript_loader: 'ok' | 'error' | 'skipped'
  static_maps_api: 'ok' | 'not_enabled' | 'error' | 'skipped'
  likely_issue: 'none' | 'api_key_api_restriction' | 'api_key_referrer' | 'unknown'
  message: string
  fix_steps: string[]
}

async function checkPlacesApi(apiKey: string): Promise<'ok' | 'error'> {
  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({ textQuery: '京都駅', maxResultCount: 1 }),
      cache: 'no-store',
    }
  )

  return response.ok ? 'ok' : 'error'
}

async function checkMapsJavaScriptLoader(
  apiKey: string
): Promise<'ok' | 'error'> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/js?key=${apiKey}`,
    {
      headers: { Referer: 'http://localhost:3000/' },
      cache: 'no-store',
    }
  )

  return response.ok ? 'ok' : 'error'
}

async function checkStaticMapsApi(
  apiKey: string
): Promise<'ok' | 'not_enabled' | 'error'> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/staticmap?center=35.01,135.77&zoom=10&size=100x100&key=${apiKey}`,
    {
      headers: { Referer: 'http://localhost:3000/' },
      cache: 'no-store',
    }
  )

  if (response.ok) return 'ok'

  const body = await response.text()
  if (body.includes('not activated on your API project')) {
    return 'not_enabled'
  }

  return 'error'
}

export async function checkGoogleMapsHealth(): Promise<GoogleMapsHealthCheck> {
  if (!isGoogleCloudConfigured()) {
    return {
      ok: false,
      places_api: 'skipped',
      maps_javascript_loader: 'skipped',
      static_maps_api: 'skipped',
      likely_issue: 'unknown',
      message: 'GOOGLE_CLOUD_API_KEY が未設定です',
      fix_steps: ['.env.local に GOOGLE_CLOUD_API_KEY を設定してください'],
    }
  }

  const apiKey = getGoogleCloudApiKey()
  const [placesApi, mapsLoader, staticMapsApi] = await Promise.all([
    checkPlacesApi(apiKey),
    checkMapsJavaScriptLoader(apiKey),
    checkStaticMapsApi(apiKey),
  ])

  const fixSteps: string[] = []

  if (placesApi !== 'ok') {
    fixSteps.push(
      'Places API を有効化し、API キーの制限リストに Places API を追加してください'
    )
  }

  if (mapsLoader === 'ok' && placesApi === 'ok') {
    fixSteps.push(
      'Cloud Console で Maps JavaScript API にリクエストがあるのにエラー 100% の場合、API ライブラリは有効で **API キーの制限** が原因です（ApiTargetBlockedMapError）'
    )
    fixSteps.push(
      '認証情報 → 使用中の API キー →「API の制限」→「キーを制限」→ リストに **Maps JavaScript API** があるか確認（Places API だけでは不可）'
    )
    fixSteps.push(
      '「アプリケーションの制限」は **HTTP リファラー** を選択し、http://localhost:3000/* と http://127.0.0.1:3000/* を追加（IP 制限はブラウザから使えません）'
    )
    fixSteps.push(
      '切り分け: 一時的に両方の制限を「なし」にすると地図が表示されるか確認 → 表示されれば制限の設定ミス'
    )
    fixSteps.push(
      '設定変更後 1〜2 分待ってから npm run dev を再起動し、ブラウザをハードリロード'
    )
  }

  if (mapsLoader === 'error') {
    fixSteps.push(
      '[Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com) を有効化してください'
    )
  }

  const likelyIssue =
    placesApi === 'ok' && mapsLoader === 'ok'
      ? 'api_key_api_restriction'
      : mapsLoader === 'error'
        ? 'unknown'
        : 'unknown'

  const runtimeBlocked =
    placesApi === 'ok' && mapsLoader === 'ok' && staticMapsApi !== 'ok'

  return {
    ok: placesApi === 'ok' && mapsLoader === 'ok' && staticMapsApi === 'ok',
    places_api: placesApi,
    maps_javascript_loader: mapsLoader,
    static_maps_api: staticMapsApi,
    likely_issue: likelyIssue,
    message: runtimeBlocked
      ? 'Maps JavaScript API は有効でスクリプトは取得できますが、ブラウザ実行時に ApiTargetBlockedMapError になる状態です。API キーの「API の制限」に Maps JavaScript API を追加してください'
      : placesApi === 'ok' && mapsLoader === 'ok'
        ? 'Places / Maps JS ローダーは利用可能です'
        : 'Google Maps Platform の設定を確認してください',
    fix_steps: fixSteps,
  }
}
