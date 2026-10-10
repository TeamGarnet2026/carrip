'use client'

import dynamic from 'next/dynamic'
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
import { CheckIcon, CloseIcon, PlusIcon, SearchIcon } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/spinner'
import { formatJapaneseDate, formatTripLength } from '@/lib/format'
import { VEHICLE_PRESETS } from '@/lib/plan/constants'
import {
  loadPlanSession,
  planStorageKey,
  savePlanSession,
} from '@/lib/plan/storage'
import type { PlanSession, StopOrderMode, TripFormValues } from '@/lib/plan/types'
import type { SpotCandidate } from '@/lib/poi/suggest'
import { MAX_SELECTED_SPOTS } from '@/lib/routes/schema'
import type { RouteCandidate, RouteStop } from '@/lib/routes/types'

const RoutesMap = dynamic(
  () => import('@/components/routes/routes-map').then((mod) => mod.RoutesMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[380px] items-center justify-center text-sm text-muted">
        地図を読み込み中…
      </div>
    ),
  }
)

type SpotPickerPanelProps = {
  planId: string
}

type ListState = {
  loading: boolean
  error: string | null
  places: SpotCandidate[]
}

const EMPTY_LIST: ListState = { loading: false, error: null, places: [] }

/** おすすめの絞り込み（優先軸の ID）。null は条件入力で選んだ優先軸のまま */
const SUGGEST_FILTERS: Array<{ id: string | null; label: string }> = [
  { id: null, label: 'おすすめ' },
  { id: 'view', label: '絶景' },
  { id: 'onsen', label: '温泉' },
  { id: 'gourmet', label: 'グルメ' },
  { id: 'hidden', label: '穴場' },
]

const PHOTO_TONES = ['bg-photo-1', 'bg-photo-2', 'bg-photo-3', 'bg-photo-4']

function photoTone(placeId: string): string {
  let hash = 0
  for (const char of placeId) hash = (hash + char.charCodeAt(0)) % PHOTO_TONES.length
  return PHOTO_TONES[hash]
}

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

/** 「条件を変更」で条件入力に戻るときに、入力済みの値を引き継ぐ URL */
function editConditionsHref(form: TripFormValues): string {
  const params = new URLSearchParams({
    step: '1',
    origin: form.origin,
    date: form.departureDate,
    days: String(form.days),
    people: String(form.people),
    vehicle: form.vehicle.type,
  })
  if (form.prefecture[0]) params.set('prefecture', form.prefecture[0])
  return `/plan/new?${params.toString()}`
}

function conditionSummary(form: TripFormValues): string[] {
  const vehicle = VEHICLE_PRESETS.find((preset) => preset.id === form.vehicle.type)
  return [
    `${formatJapaneseDate(form.departureDate)}${form.options.departureTime.replace(/^0/, '')} · ${formatTripLength(form.days)}`,
    `${form.people}人 · ${vehicle?.label.replace('（電気自動車）', '') ?? form.vehicle.type}${
      form.vehicle.fuel_km_l ? `（${form.vehicle.fuel_km_l} km/L）` : ''
    }`,
    `高速${form.options.useHighway ? 'あり' : 'なし'} · ETC${form.options.etcCard ? 'あり' : 'なし'} · ${
      form.options.roundTrip ? '往復' : '片道'
    }`,
  ]
}

export function SpotPickerPanel({ planId }: SpotPickerPanelProps) {
  const router = useRouter()
  const session = usePlanSession(planId)
  // 編集するまではセッションに保存済みの選択を表示する
  const [editedSelected, setSelected] = useState<RouteStop[] | null>(null)
  const [editedOrderMode, setOrderMode] = useState<StopOrderMode | null>(null)
  const selected = useMemo(
    () => editedSelected ?? session?.spots ?? [],
    [editedSelected, session]
  )
  const orderMode = editedOrderMode ?? session?.orderMode ?? 'auto'
  const [suggestions, setSuggestions] = useState<ListState>({
    ...EMPTY_LIST,
    loading: true,
  })
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ListState | null>(null)
  const [filter, setFilter] = useState<string | null>(null)

  const prefectures = session?.form.prefecture.join('|')
  const preferences = filter ?? session?.form.preferences.join('|')

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

  function toggleSpot(spot: SpotCandidate) {
    if (selectedIds.has(spot.place_id)) {
      removeSpot(spot.place_id)
    } else {
      addSpot(spot)
    }
  }

  function changeFilter(next: string | null) {
    if (next === filter) return
    setSuggestions({ ...EMPTY_LIST, loading: true })
    setFilter(next)
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

  // 地図に選んだ行き先を表示するため、選択中の地点を1本のルートとして渡す
  const previewRoutes = useMemo<RouteCandidate[]>(
    () =>
      selected.length === 0
        ? []
        : [
            {
              id: 'route-custom',
              title: '選んだ行き先',
              summary: '',
              transport_mode: 'car',
              stops: selected,
              polyline: selected.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
              sections: [],
              cost_breakdown: { fuel: 0, toll: 0, parking: 0, admission: 0 },
              total_distance_km: 0,
              total_duration_min: 0,
              total_cost: 0,
              cost_per_person: 0,
            },
          ],
    [selected]
  )

  if (session === null) {
    return (
      <div className="carrip-container">
        <div className="carrip-panel mx-auto max-w-lg p-8 text-center">
          <p className="m-0 font-semibold">プラン情報が見つかりません。最初からやり直してください。</p>
          <Link href="/plan/new?step=1" className="mt-5 inline-block">
            <Button variant="secondary">最初からやり直す</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" label="読み込み中" />
      </div>
    )
  }

  const listState = searchResults ?? suggestions
  const areaName = session.form.prefecture.join('・').replace(/[都府県]$/, '')

  return (
    <div className="flex flex-col">
      {/* 条件のまとめ（PC） */}
      <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-surface px-8 py-5 text-sm md:flex">
        <span>
          <span className="mr-3 text-muted">出発</span>
          <span className="font-semibold">{session.form.origin}</span>
        </span>
        {conditionSummary(session.form).map((item) => (
          <span key={item} className="flex items-center gap-6 text-ink-soft">
            <span className="text-line-strong" aria-hidden>
              /
            </span>
            {item}
          </span>
        ))}
        <Link href={editConditionsHref(session.form)} className="ml-auto">
          <Button variant="secondary" size="sm">
            条件を変更
          </Button>
        </Link>
      </div>

      <div className="grid md:min-h-[calc(100dvh-64px-65px)] md:grid-cols-[minmax(320px,1fr)_minmax(0,1.25fr)] xl:grid-cols-[minmax(340px,1fr)_minmax(0,1.25fr)_minmax(320px,0.85fr)]">
        {/* 行き先を探す */}
        <section className="flex flex-col gap-5 px-5 py-6 md:border-r md:border-line md:px-8 md:py-8">
          <h1 className="m-0 text-[26px] font-bold md:text-[28px]">
            <span className="md:hidden">{areaName}で行きたい場所</span>
            <span className="hidden md:inline">行き先を探す</span>
          </h1>
          <form onSubmit={handleSearch} role="search" className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              aria-label="行き先を検索"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                if (!event.target.value) setSearchResults(null)
              }}
              placeholder="清水寺、嵐山、水族館…"
              maxLength={100}
              className="carrip-field min-h-[52px] w-full rounded-xl border border-line-strong pr-4 pl-12 text-base outline-none focus:border-ink focus:ring-1 focus:ring-ink"
            />
          </form>

          {searchResults ? (
            <button
              type="button"
              onClick={() => {
                setSearchResults(null)
                setQuery('')
              }}
              className="w-fit text-[13px] text-brand underline underline-offset-4"
            >
              検索をやめておすすめに戻る
            </button>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="おすすめの絞り込み">
              {SUGGEST_FILTERS.map((item) => {
                const active = item.id === filter
                return (
                  <button
                    key={item.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => changeFilter(item.id)}
                    className={`min-h-10 rounded-[10px] px-4 text-sm transition ${
                      active
                        ? 'bg-ink font-semibold text-white'
                        : 'border border-line-strong bg-surface text-ink hover:bg-soft'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}

          <SpotList
            state={listState}
            selectedIds={selectedIds}
            isFull={isFull}
            onToggle={toggleSpot}
            emptyMessage={
              searchResults
                ? '見つかりませんでした。別の言葉で検索してください'
                : 'おすすめ候補が見つかりませんでした。検索から追加してください'
            }
          />
        </section>

        {/* 地図（PC） */}
        <section aria-label="選んだ行き先の地図" className="relative hidden bg-sunken md:block">
          {previewRoutes.length > 0 ? (
            <div className="h-full p-4">
              <RoutesMap
                routes={previewRoutes}
                selectedRouteId="route-custom"
                onSelectRoute={() => {}}
                originLabel={session.form.origin}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[380px] items-center justify-center px-10 text-center text-sm text-muted">
              行き先を追加すると、地図に表示します
            </div>
          )}
        </section>

        {/* 選んだ行き先（PC 右列 / 1100px 未満は地図の下） */}
        <aside className="hidden flex-col gap-5 border-line bg-surface px-8 py-8 md:col-span-2 md:flex md:border-t xl:col-span-1 xl:border-t-0 xl:border-l">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-2xl font-bold">選んだ行き先</h2>
            <span className="text-sm text-muted tabular-nums">
              {selected.length}か所{isFull && `（上限${MAX_SELECTED_SPOTS}）`}
            </span>
          </div>

          {selected.length === 0 ? (
            <p className="m-0 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
              左の検索やおすすめから、行きたい場所を追加してください。
            </p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {selected.map((stop, index) => (
                <li
                  key={stop.place_id}
                  className="flex items-center gap-3 rounded-xl border border-line px-4 py-3.5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-[1.5px] border-ink text-[13px] font-semibold">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                    {stop.name}
                  </span>
                  {orderMode === 'manual' && (
                    <>
                      <button
                        type="button"
                        aria-label={`${stop.name}を上へ`}
                        disabled={index === 0}
                        onClick={() => updateSelected(moveItem(selected, index, index - 1))}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`${stop.name}を下へ`}
                        disabled={index === selected.length - 1}
                        onClick={() => updateSelected(moveItem(selected, index, index + 1))}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    aria-label={`${stop.name}を外す`}
                    onClick={() => removeSpot(stop.place_id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          )}

          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-3 p-0 text-sm font-semibold">回る順番</legend>
            {(
              [
                {
                  id: 'auto',
                  label: 'おまかせ',
                  description: '移動距離が短くなる順に並べます',
                },
                {
                  id: 'manual',
                  label: '自分で決める',
                  description: '上のリストの順番で回ります',
                },
              ] as const
            ).map((option) => (
              <label key={option.id} className="carrip-option items-start py-4 whitespace-normal">
                <input
                  type="radio"
                  name="order-mode"
                  checked={orderMode === option.id}
                  onChange={() => updateOrderMode(option.id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-[15px]">{option.label}</span>
                  <span className="mt-1 block text-[13px] font-normal text-muted">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <Button
            className="mt-auto w-full"
            size="lg"
            disabled={selected.length === 0}
            onClick={handleCalculate}
          >
            ルートと料金を計算する
          </Button>
        </aside>
      </div>

      {/* スマホ: 選択数と計算ボタンを画面下に固定 */}
      <div className="carrip-bottom-bar flex items-center gap-4 md:hidden">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-base font-semibold">{selected.length}か所を選択中</p>
          <button
            type="button"
            onClick={() => updateOrderMode(orderMode === 'auto' ? 'manual' : 'auto')}
            className="p-0 text-[13px] text-muted underline underline-offset-4"
          >
            順番は{orderMode === 'auto' ? 'おまかせ' : '選んだ順'}
          </button>
        </div>
        <Button size="lg" disabled={selected.length === 0} onClick={handleCalculate}>
          料金を計算
        </Button>
      </div>
    </div>
  )
}

type SpotListProps = {
  state: ListState
  selectedIds: Set<string>
  isFull: boolean
  onToggle: (spot: SpotCandidate) => void
  emptyMessage: string
}

/** 「日本、〒603-8361 京都府京都市…」→「京都府京都市…」 */
function shortAddress(address: string): string {
  return address.replace(/^日本、\s*/, '').replace(/^〒\d{3}-\d{4}\s*/, '')
}

function spotMeta(spot: SpotCandidate): string {
  return [spot.rating != null ? `評価 ${spot.rating.toFixed(1)}` : null, shortAddress(spot.address)]
    .filter(Boolean)
    .join(' · ')
}

function SpotList({ state, selectedIds, isFull, onToggle, emptyMessage }: SpotListProps) {
  if (state.loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner label="読み込み中" />
      </div>
    )
  }

  if (state.error) {
    return (
      <p className="m-0 text-sm text-cost-admission" role="alert">
        {state.error}
      </p>
    )
  }

  if (state.places.length === 0) {
    return <p className="m-0 text-sm text-muted">{emptyMessage}</p>
  }

  return (
    <>
      {/* PC: 写真枠 + 名前 + 追加ボタンの行 */}
      <ul className="m-0 hidden list-none flex-col p-0 md:flex">
        {state.places.map((spot) => {
          const added = selectedIds.has(spot.place_id)
          return (
            <li
              key={spot.place_id}
              className="flex items-center gap-4 border-b border-line py-3.5"
            >
              <span
                className={`h-16 w-16 shrink-0 rounded-xl ${photoTone(spot.place_id)}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-base font-semibold">{spot.name}</p>
                <p className="mt-1 mb-0 truncate text-[13px] text-muted">{spotMeta(spot)}</p>
              </div>
              <button
                type="button"
                onClick={() => onToggle(spot)}
                disabled={!added && isFull}
                aria-pressed={added}
                className={`min-h-10 shrink-0 rounded-lg px-4 text-sm transition disabled:opacity-40 ${
                  added
                    ? 'bg-brand-soft text-brand'
                    : 'border border-line-strong bg-surface text-ink hover:bg-soft'
                }`}
              >
                {added ? '追加済み' : '追加'}
              </button>
            </li>
          )
        })}
      </ul>

      {/* スマホ: 写真カードのグリッド（右上で追加 / 外す） */}
      <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-5 p-0 md:hidden">
        {state.places.map((spot) => {
          const added = selectedIds.has(spot.place_id)
          return (
            <li key={spot.place_id}>
              <div className={`relative aspect-[9/8] rounded-2xl ${photoTone(spot.place_id)}`}>
                <button
                  type="button"
                  onClick={() => onToggle(spot)}
                  disabled={!added && isFull}
                  aria-pressed={added}
                  aria-label={added ? `${spot.name}を外す` : `${spot.name}を追加`}
                  className={`absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full disabled:opacity-40 ${
                    added ? 'bg-brand text-white' : 'bg-surface text-ink'
                  }`}
                >
                  {added ? <CheckIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 mb-0 truncate text-[15px] font-semibold">{spot.name}</p>
              <p className="mt-0.5 mb-0 truncate text-[13px] text-muted">
                {spot.rating != null ? `評価 ${spot.rating.toFixed(1)}` : shortAddress(spot.address)}
              </p>
            </li>
          )
        })}
      </ul>
    </>
  )
}
