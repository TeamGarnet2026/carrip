import { getGoogleCloudApiKey, isGoogleCloudConfigured } from '@/lib/google/config'

export type GoogleMapsHealthCheck = {
  ok: boolean
  places_api: 'ok' | 'error' | 'skipped'
  maps_javascript_loader: 'ok' | 'error' | 'skipped'
  /** 参考情報。Carrip の地図表示には未使用のため ok 判定には含めない */
  static_maps_api: 'ok' | 'not_enabled' | 'error' | 'skipped'
  likely_issue: 'none' | 'api_key_api_restriction' | 'api_key_referrer' | 'unknown'
  message: string
  fix_steps: string[]
  warnings?: string[]
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

  const requiredOk = placesApi === 'ok' && mapsLoader === 'ok'
  const fixSteps: string[] = []
  const warnings: string[] = []

  if (placesApi !== 'ok') {
    fixSteps.push(
      'Places API を有効化し、API キーの制限リストに Places API (New) を追加してください'
    )
  }

  if (mapsLoader === 'error') {
    fixSteps.push(
      '[Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com) を有効化してください'
    )
    fixSteps.push(
      'API キーの「API の制限」に Maps JavaScript API が含まれているか確認してください'
    )
    fixSteps.push(
      '「アプリケーションの制限」は HTTP リファラー にし、http://localhost:3000/* を追加（IP 制限はブラウザから使えません）'
    )
  }

  if (staticMapsApi === 'not_enabled') {
    warnings.push(
      'Static Maps API は未有効ですが、Carrip では未使用のため問題ありません'
    )
  } else if (staticMapsApi === 'error') {
    warnings.push('Static Maps API の疎通に失敗しました（Carrip では未使用）')
  }

  const likelyIssue: GoogleMapsHealthCheck['likely_issue'] = requiredOk
    ? 'none'
    : mapsLoader === 'error' && placesApi === 'ok'
      ? 'api_key_api_restriction'
      : 'unknown'

  let message: string
  if (requiredOk) {
    message =
      warnings.length > 0
        ? 'Places API / Maps JavaScript API は利用可能です（参考: Static Maps は未使用）'
        : 'Places API / Maps JavaScript API は利用可能です'
  } else {
    message = 'Google Maps Platform の必須 API（Places / Maps JavaScript）を確認してください'
  }

  return {
    ok: requiredOk,
    places_api: placesApi,
    maps_javascript_loader: mapsLoader,
    static_maps_api: staticMapsApi,
    likely_issue: likelyIssue,
    message,
    fix_steps: fixSteps,
    ...(warnings.length > 0 ? { warnings } : {}),
  }
}
