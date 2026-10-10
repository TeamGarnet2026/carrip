'use client'

import { useRef, useState, type PointerEvent } from 'react'
import { CloseIcon, GripIcon } from '@/components/ui/icons'
import { formatDuration, formatYen } from '@/lib/format'
import { driverChangeBadgeLabel } from '@/lib/poi/stop-labels'
import { buildItinerary } from '@/lib/routes/itinerary'
import { moveItem } from '@/lib/routes/reorder-stops'
import type { RouteCandidate, RouteStop } from '@/lib/routes/types'

type ItineraryListProps = {
  route: Pick<
    RouteCandidate,
    'stops' | 'polyline' | 'sections' | 'total_duration_min' | 'round_trip' | 'departure_time'
  >
  origin: string
  people: number
  departureTime?: string
  /** 指定すると並び替え・削除・駐車料金の編集ができる */
  onStopsChange?: (stops: RouteStop[], needsRouteRecalc: boolean) => void
  disabled?: boolean
  /** スマホ向けに右側の費用を名前の下にまとめる */
  compact?: boolean
  /** 出発時刻がわからないとき false にすると、時刻の代わりに順番を出す */
  showTimes?: boolean
}

function admissionText(stop: RouteStop): string | null {
  const perPerson = stop.admission_yen_per_person ?? 0
  return perPerson > 0 ? `入場 ${formatYen(perPerson)} / 人` : '入場無料'
}

/** 9:00 京都駅 出発 → 9:25 伏見稲荷大社 … の旅程 */
export function ItineraryList({
  route,
  origin,
  people,
  departureTime,
  onStopsChange,
  disabled = false,
  compact = false,
  showTimes = true,
}: ItineraryListProps) {
  const entries = buildItinerary(route, departureTime)
  const editable = onStopsChange != null
  const canEdit = editable && !disabled
  const stops = route.stops

  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])

  // ポインターイベントで実装し、マウスとタッチ（スマートフォン）の両方でドラッグできるようにする
  function handleDragStart(event: PointerEvent<HTMLElement>, index: number) {
    if (!canEdit || stops.length <= 1) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragFrom(index)
    setDragOver(index)
  }

  function handleDragMove(event: PointerEvent<HTMLElement>) {
    if (dragFrom == null) return
    const rects = rowRefs.current
      .slice(0, stops.length)
      .map((row) => row?.getBoundingClientRect())
    const y = event.clientY
    let over = rects.findIndex((rect) => rect != null && y >= rect.top && y <= rect.bottom)
    if (over < 0) {
      over = y < (rects[0]?.top ?? 0) ? 0 : stops.length - 1
    }
    if (over !== dragOver) setDragOver(over)
  }

  function handleDragEnd() {
    const from = dragFrom
    const to = dragOver
    setDragFrom(null)
    setDragOver(null)
    if (!canEdit || from == null || to == null || from === to) return
    onStopsChange!(moveItem(stops, from, to), true)
  }

  function cancelDrag() {
    setDragFrom(null)
    setDragOver(null)
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (!canEdit || target < 0 || target >= stops.length) return
    onStopsChange!(moveItem(stops, index, target), true)
  }

  function remove(index: number) {
    if (!canEdit || stops.length <= 1) return
    onStopsChange!(stops.filter((_, i) => i !== index), true)
  }

  function updateParking(index: number, parkingYen: number) {
    if (!canEdit) return
    onStopsChange!(
      stops.map((stop, i) =>
        i === index ? { ...stop, parking_yen: parkingYen, parking_source: 'manual' as const } : stop
      ),
      false
    )
  }

  return (
    <ol className="m-0 list-none border-t border-line p-0">
      {entries.map((entry) => {
        if (entry.kind !== 'stop') {
          return (
            <li
              key={entry.kind}
              className="grid grid-cols-[56px_20px_minmax(0,1fr)] items-start gap-x-4 border-b border-line py-4 md:grid-cols-[72px_24px_minmax(0,1fr)]"
            >
              <span className="text-[15px] font-semibold tabular-nums">
                {showTimes ? entry.time : ''}
              </span>
              <span className="mt-1 h-3.5 w-3.5 rounded-[3px] bg-ink" aria-hidden />
              <span>
                <span className="block text-[15px] font-semibold">{origin}</span>
                <span className="block text-[13px] text-muted">
                  {entry.kind === 'departure' ? '出発' : '帰着'}
                </span>
              </span>
            </li>
          )
        }

        const { stop, index } = entry
        const badge = driverChangeBadgeLabel(stop.category, stop.is_rest_stop)
        const parking = stop.parking_yen ?? 0
        const admissionTotal = (stop.admission_yen_per_person ?? 0) * people
        const costText = [
          !stop.is_rest_stop && parking > 0 ? `駐車 ${formatYen(parking)}` : null,
          admissionTotal > 0 ? `入場 ${formatYen(admissionTotal)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
        const sub = [
          `滞在 ${formatDuration(entry.stayMinutes)}`,
          stop.is_rest_stop ? null : admissionText(stop),
        ]
          .filter(Boolean)
          .join(' · ')
        const isDragging = dragFrom === index
        const isDropTarget = dragFrom != null && dragOver === index && dragFrom !== index

        return (
          <li
            key={stop.place_id}
            ref={(element) => {
              rowRefs.current[index] = element
            }}
            className={`grid items-start gap-x-4 border-b border-line py-4 ${
              editable
                ? 'grid-cols-[56px_20px_minmax(0,1fr)_auto] md:grid-cols-[72px_24px_minmax(0,1fr)_auto]'
                : 'grid-cols-[56px_20px_minmax(0,1fr)] md:grid-cols-[72px_24px_minmax(0,1fr)]'
            } ${isDragging ? 'opacity-50' : ''} ${
              isDropTarget ? 'rounded-xl bg-brand-tint outline outline-2 outline-brand' : ''
            }`}
          >
            <span className="flex items-center gap-1 text-[15px] font-semibold tabular-nums">
              {editable && (
                <button
                  type="button"
                  aria-label={`${stop.name}をドラッグして並び替え`}
                  title="ドラッグして並び替え"
                  disabled={!canEdit || stops.length <= 1}
                  onPointerDown={(event) => handleDragStart(event, index)}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={cancelDrag}
                  className="-ml-2 grid h-7 w-5 shrink-0 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing disabled:cursor-default disabled:opacity-30"
                >
                  <GripIcon className="h-4 w-4" />
                </button>
              )}
              {showTimes ? entry.time : `${index + 1}`}
            </span>
            <span
              className={`mt-1 h-3.5 w-3.5 rounded-full border-2 ${
                stop.is_rest_stop ? 'border-cost-fuel' : 'border-brand'
              }`}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                {stop.name}
                {badge && (
                  <span className="rounded-md bg-[#f6eed9] px-2 py-0.5 text-[11px] font-normal text-[#7a5d1c]">
                    {badge}
                  </span>
                )}
              </p>
              <p className="mt-1 mb-0 text-[13px] text-muted">{sub}</p>
              {!editable && costText && (
                <p
                  className={`mt-1 mb-0 text-[13px] text-ink-soft ${compact ? '' : 'md:hidden'}`}
                >
                  {costText}
                </p>
              )}
              {editable && !stop.is_rest_stop && (
                <label className="mt-2 flex flex-wrap items-center gap-2 text-[13px] whitespace-nowrap text-muted">
                  駐車
                  <input
                    type="number"
                    min={0}
                    step={100}
                    defaultValue={parking}
                    disabled={!canEdit}
                    key={`${stop.place_id}-${parking}`}
                    onBlur={(event) => {
                      const value = Math.max(0, Math.round(Number(event.target.value) || 0))
                      if (value !== parking) updateParking(index, value)
                    }}
                    className="carrip-field h-8 w-24 rounded-md border border-line-strong px-2 text-right text-[13px]"
                  />
                  円
                  {stop.parking_source === 'manual' && <span className="text-brand">手動</span>}
                  {admissionTotal > 0 && (
                    <span className="text-ink-soft">· 入場 {formatYen(admissionTotal)}</span>
                  )}
                </label>
              )}
            </div>
            {!compact && !editable && costText && (
              <span className="hidden text-right text-[13px] whitespace-nowrap text-ink-soft md:col-start-4 md:block">
                {costText}
              </span>
            )}
            {editable && (
              <span className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={`${stop.name}を上へ移動`}
                  disabled={!canEdit || index === 0}
                  onClick={() => move(index, -1)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken disabled:opacity-25"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`${stop.name}を下へ移動`}
                  disabled={!canEdit || index === stops.length - 1}
                  onClick={() => move(index, 1)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken disabled:opacity-25"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`${stop.name}を削除`}
                  disabled={!canEdit || stops.length <= 1}
                  onClick={() => remove(index)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-cost-admission disabled:opacity-25"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
