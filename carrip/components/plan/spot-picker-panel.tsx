'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  loadPlanSession,
  planStorageKey,
  savePlanSession,
} from '@/lib/plan/storage'
import type { PlanSession, StopOrderMode } from '@/lib/plan/types'
import type { SpotCandidate } from '@/lib/poi/suggest'
import { MAX_SELECTED_SPOTS } from '@/lib/routes/schema'
import type { RouteStop } from '@/lib/routes/types'

type SpotPickerPanelProps = {
  planId: string
}

type ListState = {
  loading: boolean
  error: string | null
  places: SpotCandidate[]
}

const EMPTY_LIST: ListState = { loading: false, error: null, places: [] }

function toRouteStop(spot: SpotCandidate): RouteStop {
  return {
    place_id: spot.place_id,
    name: spot.name,
    address: spot.address,
    lat: spot.lat,
    lng: spot.lng,
    category: spot.category ?? 'tourist',
    is_rest_stop: false,
  }
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function subscribeToNothing() {
  return () => {}
}

/** sessionStorage はサーバーで読めないため、サーバー描画時は undefined（読み込み中）を返す */
function usePlanSession(planId: string): PlanSession | null | undefined {
  const raw = useSyncExternalStore(
    subscribeToNothing,
    () => sessionStorage.getItem(planStorageKey(planId)),
    () => undefined
  )
  return useMemo(() => {
    if (raw === undefined) return undefined
    return raw === null ? null : loadPlanSession(planId)
  }, [raw, planId])
}

export function SpotPickerPanel({ planId }: SpotPickerPanelProps) {
  const router = useRouter()
  const session = usePlanSession(planId)
  // 編集するまではセッションに保存済みの選択を表示する
  const [editedSelected, setSelected] = useState<RouteStop[] | null>(null)
  const [editedOrderMode, setOrderMode] = useState<StopOrderMode | null>(null)
  const selected = editedSelected ?? session?.spots ?? []
  const orderMode = editedOrderMode ?? session?.orderMode ?? 'auto'
  const [suggestions, setSuggestions] = useState<ListState>({
    ...EMPTY_LIST,
    loading: true,
  })
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ListState | null>(null)

  const prefectures = session?.form.prefecture.join('|')
  const preferences = session?.form.preferences.join('|')

  useEffect(() => {
    if (!prefectures) return

    const params = new URLSearchParams()
    prefectures.split('|').forEach((p) => params.append('prefecture', p))
    preferences
      ?.split('|')
      .filter(Boolean)
      .forEach((p) => params.append('preference', p))

    const controller = new AbortController()
    fetch(`/api/pois/suggest?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          setSuggestions({
            ...EMPTY_LIST,
            error: data.error ?? '行き先候補を取得できませんでした',
          })
          return
        }
        setSuggestions({
          loading: false,
          error:
            data.places.length === 0 && data.degraded
              ? '現在おすすめ候補を取得できません。検索から追加してください'
              : null,
          places: data.places,
        })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSuggestions({ ...EMPTY_LIST, error: 'ネットワークエラーが発生しました' })
      })

    return () => controller.abort()
  }, [prefectures, preferences])

  const selectedIds = useMemo(
    () => new Set(selected.map((stop) => stop.place_id)),
    [selected]
  )
  const isFull = selected.length >= MAX_SELECTED_SPOTS

  function persist(nextSelected: RouteStop[], nextOrderMode: StopOrderMode) {
    const current = loadPlanSession(planId)
    if (!current) return
    // 行き先が変わったら、以前計算したルートは使えない
    savePlanSession({
      ...current,
      spots: nextSelected,
      orderMode: nextOrderMode,
      routes: undefined,
      selectedRouteId: undefined,
    })
  }

  function updateSelected(nextSelected: RouteStop[]) {
    setSelected(nextSelected)
    persist(nextSelected, orderMode)
  }

  function updateOrderMode(nextOrderMode: StopOrderMode) {
    setOrderMode(nextOrderMode)
    persist(selected, nextOrderMode)
  }

  function addSpot(spot: SpotCandidate) {
    if (selectedIds.has(spot.place_id) || isFull) return
    updateSelected([...selected, toRouteStop(spot)])
  }

  function removeSpot(placeId: string) {
    updateSelected(selected.filter((stop) => stop.place_id !== placeId))
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (!q || !session) return

    setSearchResults({ ...EMPTY_LIST, loading: true })
    const params = new URLSearchParams({ q, category: 'tourist' })
    if (session.form.prefecture[0]) {
      params.set('prefecture', session.form.prefecture[0])
    }

    try {
      const response = await fetch(`/api/pois/search?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        setSearchResults({
          ...EMPTY_LIST,
          error: data.error ?? '検索に失敗しました',
        })
        return
      }
      setSearchResults({ loading: false, error: null, places: data.places })
    } catch {
      setSearchResults({ ...EMPTY_LIST, error: 'ネットワークエラーが発生しました' })
    }
  }

  function handleCalculate() {
    if (selected.length === 0) return
    persist(selected, orderMode)
    router.push(`/plan/${planId}/routes`)
  }

  if (session === null) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">
          プラン情報が見つかりません。最初からやり直してください。
        </p>
        <Link href="/plan/new?step=1" className="mt-4 inline-block">
          <Button variant="secondary">最初からやり直す</Button>
        </Link>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="読み込み中" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="m-0 text-lg font-black text-ink">場所を検索して追加</h2>
          <form onSubmit={handleSearch} className="mt-3 flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例: 清水寺、嵐山、水族館"
              maxLength={100}
              className="min-h-[42px] flex-1 rounded-[7px] border border-line bg-[#fbfcfd] px-3 text-sm text-ink outline-none focus:border-brand"
            />
            <Button type="submit" disabled={!query.trim()}>
              検索
            </Button>
          </form>
          {searchResults && (
            <SpotList
              state={searchResults}
              selectedIds={selectedIds}
              isFull={isFull}
              onAdd={addSpot}
              emptyMessage="見つかりませんでした。別の言葉で検索してください"
            />
          )}
        </section>

        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="m-0 text-lg font-black text-ink">
            {session.form.prefecture.join('・')}のおすすめ
          </h2>
          <p className="mt-1 text-sm text-muted">
            評価の高い観光スポットです。気になる場所を追加してください。
          </p>
          <SpotList
            state={suggestions}
            selectedIds={selectedIds}
            isFull={isFull}
            onAdd={addSpot}
            emptyMessage="おすすめ候補が見つかりませんでした。検索から追加してください"
          />
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-xl border border-line bg-white p-5 lg:sticky lg:top-4">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-lg font-black text-ink">選んだ行き先</h2>
          <span className="text-sm text-muted">
            {selected.length} / {MAX_SELECTED_SPOTS}
          </span>
        </div>

        {selected.length === 0 ? (
          <p className="text-sm text-muted">
            左の検索やおすすめから、行きたい場所を追加してください。
          </p>
        ) : (
          <ol className="space-y-2">
            {selected.map((stop, index) => (
              <li
                key={stop.place_id}
                className="flex items-center gap-2 rounded-lg border border-line px-3 py-2"
              >
                {orderMode === 'manual' && (
                  <span className="w-5 text-center text-xs font-black text-brand">
                    {index + 1}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                  {stop.name}
                </span>
                {orderMode === 'manual' && (
                  <>
                    <button
                      type="button"
                      aria-label={`${stop.name}を上へ`}
                      disabled={index === 0}
                      onClick={() =>
                        updateSelected(moveItem(selected, index, index - 1))
                      }
                      className="px-1 text-muted hover:text-ink disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`${stop.name}を下へ`}
                      disabled={index === selected.length - 1}
                      onClick={() =>
                        updateSelected(moveItem(selected, index, index + 1))
                      }
                      className="px-1 text-muted hover:text-ink disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  type="button"
                  aria-label={`${stop.name}を外す`}
                  onClick={() => removeSpot(stop.place_id)}
                  className="px-1 text-muted hover:text-red-600"
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}

        <fieldset className="space-y-2">
          <legend className="text-xs font-extrabold text-muted">回る順番</legend>
          {(
            [
              {
                id: 'auto',
                label: 'おまかせ',
                description: '移動距離が短くなる順に自動で並べます',
              },
              {
                id: 'manual',
                label: '自分で決める',
                description: '上のリストの順番で回ります（↑↓で入れ替え）',
              },
            ] as const
          ).map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2 text-sm ${
                orderMode === option.id
                  ? 'border-brand bg-brand/5'
                  : 'border-line'
              }`}
            >
              <input
                type="radio"
                name="order-mode"
                checked={orderMode === option.id}
                onChange={() => updateOrderMode(option.id)}
              />
              <span>
                <span className="block font-bold text-ink">{option.label}</span>
                <span className="block text-xs text-muted">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <Button
          className="w-full"
          size="lg"
          disabled={selected.length === 0}
          onClick={handleCalculate}
        >
          ルートと料金を計算する
        </Button>
        <Link
          href="/plan/new?step=1"
          className="block text-center text-xs font-bold text-muted hover:text-ink"
        >
          条件入力に戻る
        </Link>
      </aside>
    </div>
  )
}

type SpotListProps = {
  state: ListState
  selectedIds: Set<string>
  isFull: boolean
  onAdd: (spot: SpotCandidate) => void
  emptyMessage: string
}

function SpotList({
  state,
  selectedIds,
  isFull,
  onAdd,
  emptyMessage,
}: SpotListProps) {
  if (state.loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner label="読み込み中" />
      </div>
    )
  }

  if (state.error) {
    return (
      <p className="mt-3 text-sm text-red-600" role="alert">
        {state.error}
      </p>
    )
  }

  if (state.places.length === 0) {
    return <p className="mt-3 text-sm text-muted">{emptyMessage}</p>
  }

  return (
    <ul className="mt-3 divide-y divide-line">
      {state.places.map((spot) => {
        const added = selectedIds.has(spot.place_id)
        return (
          <li key={spot.place_id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-bold text-ink">
                {spot.name}
              </p>
              <p className="m-0 truncate text-xs text-muted">
                {spot.rating != null && (
                  <span className="mr-2 font-bold text-amber-600">
                    ★ {spot.rating.toFixed(1)}
                    {spot.user_rating_count != null &&
                      `（${spot.user_rating_count.toLocaleString('ja-JP')}件）`}
                  </span>
                )}
                {spot.address}
              </p>
            </div>
            <Button
              size="sm"
              variant={added ? 'ghost' : 'secondary'}
              disabled={added || isFull}
              onClick={() => onAdd(spot)}
            >
              {added ? '追加済み' : '追加'}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
