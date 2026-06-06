'use client'

import { useCallback, useState } from 'react'
import { RoutesGoogleMap } from '@/components/routes/routes-google-map'
import { RoutesOsmMap } from '@/components/routes/routes-osm-map'
import { getGoogleMapsApiKey } from '@/lib/google/maps-key'
import type { RouteCandidate } from '@/lib/routes/types'

type RoutesMapProps = {
  routes: RouteCandidate[]
  selectedRouteId: string
  onSelectRoute: (routeId: string) => void
  originLabel?: string
}

const API_KEY_RESTRICTION_HINT =
  'Maps JavaScript API へのリクエストは届いていますがエラー 100% の場合、API キーの「API の制限」に Maps JavaScript API が含まれていない可能性が高いです（Places API のみ許可していると ApiTargetBlockedMapError になります）。'

export function RoutesMap(props: RoutesMapProps) {
  const apiKey = getGoogleMapsApiKey()
  const [useOsmFallback, setUseOsmFallback] = useState(!apiKey)
  const [fallbackReason, setFallbackReason] = useState<string | null>(
    apiKey
      ? null
      : 'GOOGLE_CLOUD_API_KEY が未設定のため OpenStreetMap を表示しています'
  )

  const handleGoogleMapsAuthFailure = useCallback(() => {
    setUseOsmFallback(true)
    setFallbackReason(API_KEY_RESTRICTION_HINT)
  }, [])

  if (useOsmFallback) {
    return (
      <div className="space-y-3">
        {fallbackReason && (
          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <p>{fallbackReason}</p>
            <p className="mt-2">
              Cloud Console →{' '}
              <a
                className="underline"
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
              >
                認証情報
              </a>
              → API キー →「API の制限」に Maps JavaScript API を追加 /
              「アプリケーションの制限」→ HTTP リファラー{' '}
              <code className="text-[11px]">http://localhost:3000/*</code>
              <br />
              診断:{' '}
              <a
                className="underline"
                href="/api/health/google-maps"
                target="_blank"
                rel="noreferrer"
              >
                /api/health/google-maps
              </a>
            </p>
          </div>
        )}
        <RoutesOsmMap {...props} />
      </div>
    )
  }

  return (
    <RoutesGoogleMap
      {...props}
      onAuthFailure={handleGoogleMapsAuthFailure}
    />
  )
}
