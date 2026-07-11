'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DegradedBanner } from '@/components/routes/degraded-banner'
import { RouteDetailPanel } from '@/components/routes/route-detail-panel'
import { RouteCard } from '@/components/route/route-card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { GENERATION_STEPS } from '@/lib/plan/constants'
import { loadPlanSession, savePlanSession } from '@/lib/plan/storage'
import { toRouteGenerateRequest } from '@/lib/plan/types'
import { recalculateRouteCostsLocally } from '@/lib/routes/cost-sources'
import type {
  RouteCandidate,
  RouteSearchResponse,
  RouteStop,
} from '@/lib/routes/types'

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

type SortKey = 'score' | 'cost' | 'time'
type GenerateMode = 'stub' | 'live'

type RoutesListPanelProps = {
  planId: string
}

export function RoutesListPanel({ planId }: RoutesListPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generatingMode, setGeneratingMode] = useState<GenerateMode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RouteSearchResponse | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [originLabel, setOriginLabel] = useState<string>('')
  const [sessionMissing, setSessionMissing] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [costDelta, setCostDelta] = useState<number | null>(null)

  useEffect(() => {
    const session = loadPlanSession(planId)
    if (!session) {
      setSessionMissing(true)
      return
    }

    setOriginLabel(session.form.origin)

    if (session.routes) {
      setResult(session.routes)
      setSelectedRouteId(session.selectedRouteId ?? session.routes.routes[0]?.id ?? null)
    }
  }, [planId])

  const generateRoutes = useCallback(
    async (mode: GenerateMode) => {
      const session = loadPlanSession(planId)
      if (!session) {
        setSessionMissing(true)
        return
      }

      setLoading(true)
      setGeneratingMode(mode)
      setError(null)

      try {
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 30000)

        const endpoint =
          mode === 'stub'
            ? '/api/routes/generate?mode=stub'
            : '/api/routes/generate'

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toRouteGenerateRequest(session.form)),
          signal: controller.signal,
        })

        window.clearTimeout(timeout)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? 'ルートの生成に失敗しました')
          return
        }

        const routes = data as RouteSearchResponse
        setResult(routes)
        const firstRouteId = routes.routes[0]?.id ?? null
        setSelectedRouteId(firstRouteId)
        savePlanSession({
          ...session,
          routes,
          selectedRouteId: firstRouteId ?? undefined,
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          router.push('/error?code=DR-RTE-003')
          return
        }
        setError('ネットワークエラーが発生しました')
      } finally {
        setLoading(false)
        setGeneratingMode(null)
      }
    },
    [planId, router]
  )

  const sortedRoutes = useMemo(() => {
    if (!result) return []
    const routes = [...result.routes]
    if (sortKey === 'cost') {
      routes.sort((a, b) => a.total_cost - b.total_cost)
    } else if (sortKey === 'time') {
      routes.sort((a, b) => a.total_duration_min - b.total_duration_min)
    }
    return routes
  }, [result, sortKey])

  const selectedRoute = sortedRoutes.find((route) => route.id === selectedRouteId)
  const selectedIndex = sortedRoutes.findIndex((route) => route.id === selectedRouteId)
  const session = loadPlanSession(planId)
  const people = session?.form.people ?? 2
  const budgetPerPerson =
    session?.form.budgetMode === 'total' && session.form.budgetPerPerson
      ? Math.ceil(session.form.budgetPerPerson / people)
      : session?.form.budgetPerPerson

  const overBudget =
    budgetPerPerson != null &&
    selectedRoute != null &&
    selectedRoute.cost_per_person > budgetPerPerson

  function handleSelectRoute(routeId: string) {
    setSelectedRouteId(routeId)
    setCostDelta(null)
    const current = loadPlanSession(planId)
    if (current) {
      savePlanSession({ ...current, selectedRouteId: routeId })
    }
  }

  const applyRouteUpdate = useCallback(
    (routeId: string, updater: (route: RouteCandidate) => RouteCandidate) => {
      setResult((current) => {
        if (!current) return current
        const previous = current.routes.find((r) => r.id === routeId)
        const next = {
          ...current,
          routes: current.routes.map((route) =>
            route.id === routeId ? updater(route) : route
          ),
        }
        const updated = next.routes.find((r) => r.id === routeId)

        if (previous && updated) {
          const delta = updated.total_cost - previous.total_cost
          setCostDelta(delta !== 0 ? delta : null)
        }

        const session = loadPlanSession(planId)
        if (session) {
          savePlanSession({ ...session, routes: next })
        }
        return next
      })
    },
    [planId]
  )

  const handleStopsChange = useCallback(
    async (stops: RouteStop[], needsRouteRecalc: boolean) => {
      const session = loadPlanSession(planId)
      const routeId = selectedRouteId
      if (!session || !routeId || !result) return

      if (!needsRouteRecalc) {
        applyRouteUpdate(routeId, (route) =>
          recalculateRouteCostsLocally(route, stops, session.form.people)
        )
        return
      }

      setRecalculating(true)
      setError(null)

      try {
        const stubMode = result.mode === 'stub' || result.cache_key === 'stub'
        const endpoint = stubMode
          ? '/api/routes/recalculate?mode=stub'
          : '/api/routes/recalculate'

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request: toRouteGenerateRequest(session.form),
            route_id: routeId,
            stops,
          }),
        })
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? 'ルートの再計算に失敗しました')
          return
        }

        applyRouteUpdate(routeId, (route) => ({
          ...route,
          stops: data.stops,
          polyline: data.polyline,
          sections: data.sections,
          cost_breakdown: data.cost_breakdown,
          cost_sources: data.cost_sources,
          total_distance_km: data.total_distance_km,
          total_duration_min: data.total_duration_min,
          total_cost: data.total_cost,
          cost_per_person: data.cost_per_person,
          departure_time: data.departure_time,
          arrival_time: data.arrival_time,
          round_trip: data.round_trip,
        }))
      } catch {
        setError('ネットワークエラーが発生しました')
      } finally {
        setRecalculating(false)
      }
    },
    [planId, selectedRouteId, result, applyRouteUpdate]
  )

  const addableStops = useMemo(() => {
    if (!result || !selectedRouteId) return []
    const seen = new Set<string>()
    const candidates: RouteStop[] = []

    for (const route of result.routes) {
      if (route.id === selectedRouteId) continue
      for (const stop of route.stops) {
        if (stop.is_rest_stop) continue
        if (seen.has(stop.place_id)) continue
        seen.add(stop.place_id)
        candidates.push(stop)
      }
    }
    return candidates
  }, [result, selectedRouteId])

  if (sessionMissing) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
        <p className="font-medium text-red-800 dark:text-red-200">
          プラン情報が見つかりません。最初からやり直してください。
        </p>
        <Link href="/plan/new?step=1" className="mt-4 inline-block">
          <Button variant="secondary">最初からやり直す</Button>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-6 py-16">
        <Spinner size="lg" label="ルートを生成中" />
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {generatingMode === 'stub'
            ? 'スタブデータを準備しています…'
            : '外部APIで候補ルートを生成しています（最大30秒）'}
        </p>
        {generatingMode === 'live' && <GenerationProgress />}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
        <p className="font-medium text-red-800 dark:text-red-200">{error}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/plan/new?step=4">
            <Button variant="secondary">条件を変更する</Button>
          </Link>
          <Button onClick={() => void generateRoutes('stub')}>スタブで表示</Button>
          <Button variant="secondary" onClick={() => void generateRoutes('live')}>
            APIで再試行
          </Button>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">ルート候補を生成</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          APIを毎回すべて呼び出すと利用制限に達しやすいため、必要な方法を選んでください。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => void generateRoutes('stub')}>スタブで表示</Button>
          <Button variant="secondary" onClick={() => void generateRoutes('live')}>
            APIで生成（フル）
          </Button>
        </div>
        <p className="mt-4 text-xs text-neutral-500">
          個別ステップのテストは{' '}
          <Link href="/test-api" className="underline">
            /test-api
          </Link>{' '}
          から実行できます。
        </p>
      </div>
    )
  }

  if (sortedRoutes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm dark:border-neutral-700">
        条件に合うルートが見つかりませんでした。
        <Link href="/plan/new?step=3" className="ml-2 underline">
          条件を変更する
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {overBudget && (
        <div
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          設定した予算（1人あたり {budgetPerPerson!.toLocaleString('ja-JP')}円）を超過しています。
        </div>
      )}

      {(result.degraded || result.degraded_reasons?.length) && (
        <DegradedBanner
          degraded={result.degraded}
          degradedReasons={result.degraded_reasons}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {sortedRoutes.length}案 · {originLabel} 出発
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void generateRoutes('stub')}
          >
            スタブ再生成
          </Button>
          <Button size="sm" onClick={() => void generateRoutes('live')}>
            APIで再生成
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
        {(['score', 'cost', 'time'] as SortKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            className={`rounded-full px-3 py-1 ${
              sortKey === key
                ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-neutral-950'
                : 'border border-neutral-300 dark:border-neutral-700'
            }`}
          >
            {key === 'score' ? 'おすすめ' : key === 'cost' ? '安い順' : '早い順'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {sortedRoutes.map((route, index) => (
          <RouteCard
            key={route.id}
            route={route}
            index={index}
            people={people}
            isSelected={route.id === selectedRouteId}
            onClick={() => handleSelectRoute(route.id)}
          />
        ))}
      </div>

      {selectedRouteId && (
        <RoutesMap
          routes={sortedRoutes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={handleSelectRoute}
          originLabel={originLabel}
        />
      )}

      {costDelta != null && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
            costDelta > 0
              ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
              : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
          }`}
        >
          変更により費用が{' '}
          {costDelta > 0
            ? `+${costDelta.toLocaleString('ja-JP')}円 増加`
            : `−${Math.abs(costDelta).toLocaleString('ja-JP')}円 減少`}
          しました
        </div>
      )}

      {selectedRoute && selectedIndex >= 0 && (
        <RouteDetailPanel
          route={selectedRoute}
          index={selectedIndex}
          origin={originLabel}
          people={people}
          editable
          recalculating={recalculating}
          addableStops={addableStops}
          onStopsChange={handleStopsChange}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`/plan/${planId}/confirmed`}>
          <Button>このルートを選ぶ</Button>
        </Link>
        <Link href={`/plan/${planId}/confirmed`}>
          <Button variant="secondary">保存して共有</Button>
        </Link>
      </div>
    </div>
  )
}

function GenerationProgress() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % GENERATION_STEPS.length)
    }, 2500)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <ol className="space-y-2 text-sm">
      {GENERATION_STEPS.map((label, index) => (
        <li
          key={label}
          className={
            index <= activeStep
              ? 'text-teal-700 dark:text-teal-400'
              : 'text-neutral-400'
          }
        >
          {index <= activeStep ? '✓' : '…'} {label}
        </li>
      ))}
    </ol>
  )
}
