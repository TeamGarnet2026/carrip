'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { RouteDetailPanel } from '@/components/routes/route-detail-panel'
import type { RouteSearchResponse } from '@/lib/routes/types'

const RoutesMap = dynamic(
  () =>
    import('@/components/routes/routes-map').then((mod) => mod.RoutesMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] items-center justify-center rounded border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700">
        地図を読み込み中…
      </div>
    ),
  }
)

const TEST_PRESET = {
  label: '京都 → 名古屋',
  origin: '京都駅',
  prefecture: ['愛知県'],
  days: 2,
  people: 4,
} as const

function departureDateIso(): string {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().slice(0, 10)
}

export function RouteTestPanel() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [presetLabel, setPresetLabel] = useState<string | null>(null)
  const [originLabel, setOriginLabel] = useState<string | null>(null)
  const [result, setResult] = useState<RouteSearchResponse | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  useEffect(() => {
    if (result?.routes[0]) {
      setSelectedRouteId(result.routes[0].id)
    }
  }, [result])

  async function handleFetchTestRoute() {
    setLoading(true)
    setError(null)

    const preset = TEST_PRESET
    setPresetLabel(preset.label)
    setOriginLabel(preset.origin)

    try {
      const response = await fetch('/api/routes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: preset.origin,
          prefecture: [...preset.prefecture],
          departure_date: departureDateIso(),
          days: preset.days,
          people: preset.people,
          vehicle: { type: 'compact' },
          preferences: ['scenic'],
          options: { use_highway: true, etc_card: true },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'ルートの取得に失敗しました')
        setResult(null)
        setSelectedRouteId(null)
        return
      }

      setResult(data as RouteSearchResponse)
    } catch {
      setError('ネットワークエラーが発生しました')
      setResult(null)
      setSelectedRouteId(null)
    } finally {
      setLoading(false)
    }
  }

  const selectedRoute = result?.routes.find(
    (route) => route.id === selectedRouteId
  )
  const selectedIndex =
    result?.routes.findIndex((route) => route.id === selectedRouteId) ?? -1

  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={handleFetchTestRoute}
        disabled={loading}
        className="rounded border border-dashed border-neutral-400 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        {loading
          ? 'NAVITIME / Google / Gemini で生成中…'
          : '🧪 テスト: 京都 → 名古屋のルートを取得'}
      </button>

      {presetLabel && (
        <p className="mt-2 text-xs text-neutral-500">
          取得条件: {presetLabel}
          {result && (
            <>
              {' '}
              · {result.cached ? 'キャッシュヒット' : '新規生成'}
              {' '}
              · {result.cache_backend === 'redis' ? 'Redis' : '開発用メモリ'}
            </>
          )}
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {result?.degraded && (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Gemini が利用できないため、評価順ベースのルート案を表示しています
        </p>
      )}

      {result && selectedRouteId && (
        <div className="mt-4 space-y-4">
          <RoutesMap
            routes={result.routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            originLabel={originLabel ?? undefined}
          />

          {selectedRoute && selectedIndex >= 0 && (
            <RouteDetailPanel route={selectedRoute} index={selectedIndex} />
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <p className="mt-4 text-sm text-neutral-500">
          京都駅から愛知県（名古屋方面）の観光ルートを NAVITIME Route(car)
          で取得します。地図上のルートまたは凡例をクリックすると詳細が表示されます。
        </p>
      )}
    </div>
  )
}
