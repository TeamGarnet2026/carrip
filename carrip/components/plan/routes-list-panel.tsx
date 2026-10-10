'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { DegradedBanner } from '@/components/routes/degraded-banner'
import { RouteDetailPanel } from '@/components/routes/route-detail-panel'
import { CostLegend } from '@/components/route/cost-bar'
import { RouteCard } from '@/components/route/route-card'
import { Button } from '@/components/ui/button'
import { CheckIcon } from '@/components/ui/icons'
import { formatJapaneseDate, formatYen } from '@/lib/format'
import { GENERATION_STEPS } from '@/lib/plan/constants'
import { loadPlanSession, planStorageKey, savePlanSession } from '@/lib/plan/storage'
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
      <div className="flex h-[380px] items-center justify-center text-sm text-muted">
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
  // スマホではルート一覧 → 詳細の2画面に分ける
  const [mobileDetail, setMobileDetail] = useState(false)

  const generateRoutes = useCallback(
    async (mode: GenerateMode) => {
      const session = loadPlanSession(planId)
      if (!session) {
        setSessionMissing(true)
        return
      }
      if (!session.spots?.length) {
        router.replace(`/plan/${planId}/spots`)
        return
      }

      setLoading(true)
      setGeneratingMode(mode)
      setError(null)

      try {
        const controller = new AbortController()
        // 運転交代地点の挿入で経路を取り直すことがあるため長めに待つ
        const timeout = window.setTimeout(() => controller.abort(), 60000)

        const endpoint =
          mode === 'stub' ? '/api/routes/build?mode=stub' : '/api/routes/build'

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request: toRouteGenerateRequest(session.form),
            stops: session.spots,
            order_mode: session.orderMode ?? 'auto',
          }),
          signal: controller.signal,
        })

        window.clearTimeout(timeout)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? 'ルートの計算に失敗しました')
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

  // 開発時の Strict Mode で effect が2回走っても、外部 API を二重に呼ばない
  const autoStarted = useRef(false)

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
      return
    }

    if (autoStarted.current) return
    autoStarted.current = true
    void generateRoutes('live')
  }, [planId, generateRoutes])

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

  // 行き先選択で選んだ場所のうち、表示中のルートに含まれていないものを追加候補にする
  const addableStops = useMemo(() => {
    if (!result || !selectedRouteId) return []
    const route = result.routes.find((r) => r.id === selectedRouteId)
    const inRoute = new Set(route?.stops.map((stop) => stop.place_id))
    return (loadPlanSession(planId)?.spots ?? []).filter(
      (stop) => !inRoute.has(stop.place_id)
    )
  }, [planId, result, selectedRouteId])

  if (sessionMissing) {
    return (
      <div className="carrip-panel mx-auto max-w-lg p-8 text-center">
        <p className="m-0 font-semibold">プラン情報が見つかりません。最初からやり直してください。</p>
        <Link href="/plan/new?step=1" className="mt-5 inline-block">
          <Button variant="secondary">最初からやり直す</Button>
        </Link>
      </div>
    )
  }

  if (loading || (!result && !error)) {
    return (
      <GenerationProgress mode={generatingMode} planId={planId} />
    )
  }

  if (error || !result) {
    return (
      <div className="carrip-panel mx-auto max-w-2xl p-8">
        <p className="m-0 text-lg font-semibold">ルートを計算できませんでした</p>
        <p className="mt-2 mb-0 text-sm text-ink-soft">{error}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => void generateRoutes('live')}>もう一度計算する</Button>
          <Link href={`/plan/${planId}/spots`}>
            <Button variant="secondary">行き先を変更する</Button>
          </Link>
          {process.env.NODE_ENV !== 'production' && (
            <Button variant="ghost" onClick={() => void generateRoutes('stub')}>
              サンプルで表示（開発用）
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (sortedRoutes.length === 0) {
    return (
      <div className="carrip-panel mx-auto max-w-2xl p-8 text-sm">
        ルートが見つかりませんでした。
        <Link href={`/plan/${planId}/spots`} className="ml-2">
          行き先を変更する
        </Link>
      </div>
    )
  }

  const recommendedId = result.routes[0]?.id
  const routesWithinBudget =
    budgetPerPerson != null
      ? sortedRoutes.filter((route) => route.cost_per_person <= budgetPerPerson).length
      : null
  const eyebrow = session
    ? `${session.form.origin} 出発 · ${formatJapaneseDate(session.form.departureDate)} · ${people}人`
    : ''
  const selectedLabel = selectedIndex >= 0 ? `案${selectedIndex + 1}` : ''

  const sortControl = (
    <div role="group" aria-label="並び替え" className="flex gap-0.5 rounded-[10px] bg-segment p-1">
      {(['score', 'cost', 'time'] as SortKey[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={sortKey === key}
          onClick={() => setSortKey(key)}
          className={`min-h-9 flex-1 rounded-lg px-4 text-[13px] whitespace-nowrap transition ${
            sortKey === key ? 'bg-surface font-medium text-ink' : 'text-ink hover:bg-surface/60'
          }`}
        >
          {key === 'score' ? 'おすすめ' : key === 'cost' ? '安い順' : '早い順'}
        </button>
      ))}
    </div>
  )

  const map = selectedRouteId ? (
    <RoutesMap
      routes={sortedRoutes}
      selectedRouteId={selectedRouteId}
      onSelectRoute={handleSelectRoute}
      originLabel={originLabel}
    />
  ) : null

  return (
    <div className="flex flex-col gap-7">
      {/* 見出し（スマホで詳細表示中は隠す） */}
      <div
        className={`flex flex-wrap items-end justify-between gap-4 ${mobileDetail ? 'hidden md:flex' : ''}`}
      >
        <div className="flex flex-col gap-2">
          <p className="m-0 hidden text-[13px] text-muted md:block">{eyebrow}</p>
          <h1 className="m-0 text-[30px] leading-tight font-bold md:text-[32px]">ルートと料金</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {routesWithinBudget != null && (
            <span
              className={`text-[13px] ${
                routesWithinBudget === sortedRoutes.length ? 'text-brand' : 'text-cost-admission'
              }`}
            >
              {routesWithinBudget === sortedRoutes.length
                ? `${sortedRoutes.length}ルートとも予算（1人 ${formatYen(budgetPerPerson!)}）内`
                : `${sortedRoutes.length - routesWithinBudget}ルートが予算（1人 ${formatYen(budgetPerPerson!)}）を超えています`}
            </span>
          )}
          <div className="hidden md:block">{sortControl}</div>
        </div>
      </div>

      {(result.degraded || result.degraded_reasons?.length) && (
        <DegradedBanner degraded={result.degraded} degradedReasons={result.degraded_reasons} />
      )}

      {overBudget && (
        <p
          className="m-0 rounded-xl bg-[#f6e4dd] px-4 py-3 text-sm font-medium text-[#8a3f27]"
          role="alert"
        >
          選んでいるルートは、設定した予算（1人あたり {formatYen(budgetPerPerson!)}）を超えています。
        </p>
      )}

      {costDelta != null && (
        <p
          role="status"
          className={`m-0 rounded-xl px-4 py-3 text-sm font-medium ${
            costDelta > 0 ? 'bg-[#f6e4dd] text-[#8a3f27]' : 'bg-brand-soft text-brand'
          }`}
        >
          変更により費用が{' '}
          {costDelta > 0
            ? `+${costDelta.toLocaleString('ja-JP')}円 増えました`
            : `−${Math.abs(costDelta).toLocaleString('ja-JP')}円 減りました`}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        {/* ルート候補（スマホは地図 → 並び替え → カード） */}
        <div
          className={`flex min-w-0 flex-[1_1_380px] flex-col gap-3 ${mobileDetail ? 'hidden md:flex' : ''}`}
        >
          <div className="overflow-hidden rounded-2xl md:hidden">{map}</div>
          <div className="md:hidden">{sortControl}</div>
          <div role="radiogroup" aria-label="ルート候補" className="flex flex-col gap-3">
            {sortedRoutes.map((route, index) => (
              <RouteCard
                key={route.id}
                route={route}
                index={index}
                people={people}
                isSelected={route.id === selectedRouteId}
                onClick={() => handleSelectRoute(route.id)}
                showRecommendBadge={route.id === recommendedId}
                overBudget={budgetPerPerson != null && route.cost_per_person > budgetPerPerson}
                collapsed={route.id !== selectedRouteId}
              />
            ))}
          </div>
          <div className="mt-3 hidden md:block">
            <CostLegend />
          </div>
          <div className="mt-4 hidden flex-wrap gap-3 md:flex">
            <Button variant="secondary" size="sm" onClick={() => void generateRoutes('live')}>
              もう一度計算する
            </Button>
          </div>
        </div>

        {/* 選んだルートの詳細 */}
        {selectedRoute && selectedIndex >= 0 && (
          <div className={`min-w-0 flex-[1.4_1_520px] ${mobileDetail ? '' : 'hidden md:block'}`}>
            <RouteDetailPanel
              route={selectedRoute}
              index={selectedIndex}
              origin={originLabel}
              people={people}
              editable
              recalculating={recalculating}
              addableStops={addableStops}
              onStopsChange={handleStopsChange}
              map={<div className="hidden md:block">{map}</div>}
              departureTime={session?.form.options.departureTime}
              fuelKmL={session?.form.vehicle.fuel_km_l}
            />
          </div>
        )}
      </div>

      {/* 操作ボタン */}
      <div className="hidden justify-end gap-3 border-t border-line pt-6 md:flex">
        <Link href={`/plan/${planId}/spots`}>
          <Button variant="secondary" size="lg">
            行き先を変更
          </Button>
        </Link>
        <Link href={`/plan/${planId}/confirmed`}>
          <Button size="lg">{selectedLabel}で保存して共有</Button>
        </Link>
      </div>
      <div className="carrip-bottom-bar -mx-5 -mb-10 flex gap-3 md:hidden">
        {mobileDetail ? (
          <>
            <Button variant="secondary" size="lg" onClick={() => setMobileDetail(false)}>
              案を選び直す
            </Button>
            <Link href={`/plan/${planId}/confirmed`} className="flex-1">
              <Button size="lg" className="w-full">
                保存して共有
              </Button>
            </Link>
          </>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setMobileDetail(true)}>
            {selectedLabel}の詳細を見る
          </Button>
        )}
      </div>
    </div>
  )
}

function subscribeToNothing() {
  return () => {}
}

function GenerationProgress({ mode, planId }: { mode: GenerateMode | null; planId: string }) {
  const [activeStep, setActiveStep] = useState(0)
  // sessionStorage はサーバーで読めないため、サーバー描画時は空にして表示のずれを防ぐ
  const rawSession = useSyncExternalStore(
    subscribeToNothing,
    () => sessionStorage.getItem(planStorageKey(planId)),
    () => null
  )
  const summary = useMemo(() => {
    if (!rawSession) return ''
    const session = loadPlanSession(planId)
    if (!session) return ''
    const names = (session.spots ?? []).map((stop) => stop.name).join(' · ')
    return names ? `${session.form.origin} → ${names}` : session.form.origin
  }, [rawSession, planId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, GENERATION_STEPS.length - 1))
    }, 2500)
    return () => window.clearInterval(timer)
  }, [])

  const progress = ((activeStep + 0.5) / GENERATION_STEPS.length) * 100

  return (
    <div className="mx-auto w-full max-w-[720px] py-6 md:py-16">
      {summary && <p className="m-0 text-sm text-muted">{summary}</p>}
      <h1 className="mt-3 mb-0 text-[26px] leading-tight font-bold md:text-[34px]">
        ルートと料金を計算しています
      </h1>
      <p className="mt-3 mb-0 text-[15px] text-ink-soft">
        {mode === 'stub'
          ? 'サンプルデータを準備しています。'
          : '通常は数秒、混み合っているときは最大60秒ほどかかります。'}
      </p>
      <div
        className="mt-8 h-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="計算の進み具合"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div className="h-full bg-brand transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
      <ol className="mt-8 mb-0 list-none overflow-hidden rounded-2xl border border-line bg-surface p-0">
        {GENERATION_STEPS.map((label, index) => {
          const done = index < activeStep
          const current = index === activeStep
          return (
            <li
              key={label}
              className="flex items-center gap-4 border-b border-line px-6 py-5 text-[15px] last:border-0"
            >
              {done ? (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand">
                  <CheckIcon className="h-4 w-4" />
                </span>
              ) : current ? (
                <span
                  className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand"
                  aria-hidden
                />
              ) : (
                <span className="h-7 w-7 rounded-full border border-line-strong" aria-hidden />
              )}
              <span className={current ? 'font-semibold' : done ? '' : 'text-muted'}>
                {done ? label.replace(/中$/, '') : label}
              </span>
              {done && <span className="ml-auto text-[13px] text-muted">完了</span>}
            </li>
          )
        })}
      </ol>
      <Link href={`/plan/${planId}/spots`} className="mt-8 inline-block text-sm">
        キャンセルして行き先を変更
      </Link>
    </div>
  )
}
