'use client'

import { useState } from 'react'
import { OpenInGoogleMapsLink } from '@/components/maps/open-in-google-maps-link'
import { RoundTripLegend } from '@/components/maps/round-trip-legend'
import { CostBreakdownPanel } from '@/components/route/cost-breakdown-panel'
import { isRoundTripRoute } from '@/lib/maps/round-trip-display'
import { driverChangeBadgeLabel } from '@/lib/poi/stop-labels'
import type { RouteCandidate, RouteStop } from '@/lib/routes/types'

type RouteDetailPanelProps = {
  route: RouteCandidate
  index: number
  origin?: string
  people?: number
  editable?: boolean
  recalculating?: boolean
  addableStops?: RouteStop[]
  onStopsChange?: (stops: RouteStop[], needsRouteRecalc: boolean) => void
  showIndexLabel?: boolean
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}分`
  if (mins === 0) return `${hours}時間`
  return `${hours}時間${mins}分`
}

function formatYen(amount: number): string {
  return `${amount.toLocaleString('ja-JP')}円`
}

export function RouteDetailPanel({
  route,
  index,
  origin,
  people = 2,
  editable = false,
  recalculating = false,
  addableStops = [],
  onStopsChange,
  showIndexLabel = true,
}: RouteDetailPanelProps) {
  const [showAddList, setShowAddList] = useState(false)

  const canEdit = editable && onStopsChange != null && !recalculating
  const roundTrip = isRoundTripRoute(route)

  function moveStop(stopIndex: number, direction: -1 | 1) {
    if (!canEdit) return
    const target = stopIndex + direction
    if (target < 0 || target >= route.stops.length) return

    const stops = [...route.stops]
    ;[stops[stopIndex], stops[target]] = [stops[target], stops[stopIndex]]
    onStopsChange!(stops, true)
  }

  function removeStop(stopIndex: number) {
    if (!canEdit || route.stops.length <= 1) return
    const stops = route.stops.filter((_, i) => i !== stopIndex)
    onStopsChange!(stops, true)
  }

  function addStop(stop: RouteStop) {
    if (!canEdit) return
    setShowAddList(false)
    onStopsChange!([...route.stops, stop], true)
  }

  function updateParking(stopIndex: number, parkingYen: number) {
    if (!canEdit) return
    const stops = route.stops.map((stop, i) =>
      i === stopIndex
        ? { ...stop, parking_yen: parkingYen, parking_source: 'manual' as const }
        : stop
    )
    onStopsChange!(stops, false)
  }

  const availableToAdd = addableStops.filter(
    (candidate) =>
      !route.stops.some((stop) => stop.place_id === candidate.place_id)
  )

  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {showIndexLabel ? `案${index + 1}: ` : ''}
          {route.title}
        </p>
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          🚗 車移動のみ
        </span>
        {roundTrip && (
          <span className="rounded bg-teal-100 px-2 py-0.5 text-xs text-teal-800 dark:bg-teal-950 dark:text-teal-200">
            往復
          </span>
        )}
        {recalculating && (
          <span className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400">
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden
            />
            費用を再計算中…
          </span>
        )}
      </div>

      {route.summary && (
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {route.summary}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
          <p className="mb-2 font-medium">費用内訳</p>
          <CostBreakdownPanel
            breakdown={route.cost_breakdown}
            people={people}
            sources={route.cost_sources}
          />
        </div>
        <div className="rounded bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
          <p className="mb-2 font-medium">走行概要</p>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-400">
            <li>総距離: {route.total_distance_km} km</li>
            <li>総時間: {formatDuration(route.total_duration_min)}</li>
            <li>総費用: {formatYen(route.total_cost)}</li>
            <li>1人あたり: {formatYen(route.cost_per_person)}</li>
            {route.departure_time && (
              <li>出発: {route.departure_time.replace('T', ' ').slice(0, 16)}</li>
            )}
            {route.arrival_time && (
              <li>到着: {route.arrival_time.replace('T', ' ').slice(0, 16)}</li>
            )}
          </ul>
        </div>
      </div>

      {route.stops.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">立ち寄り地点</p>
            {editable && availableToAdd.length > 0 && (
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setShowAddList((current) => !current)}
                className="text-xs text-teal-700 underline disabled:opacity-50 dark:text-teal-400"
              >
                {showAddList ? '閉じる' : '＋候補から追加'}
              </button>
            )}
          </div>

          {showAddList && (
            <ul className="mb-3 space-y-1 rounded border border-dashed border-neutral-300 p-2 text-sm dark:border-neutral-700">
              {availableToAdd.map((candidate) => (
                <li
                  key={candidate.place_id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {candidate.name}
                  </span>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => addStop(candidate)}
                    className="rounded border border-teal-600 px-2 py-0.5 text-xs text-teal-700 disabled:opacity-50 dark:border-teal-400 dark:text-teal-400"
                  >
                    追加
                  </button>
                </li>
              ))}
            </ul>
          )}

          {roundTrip && (
            <div className="mb-3">
              <RoundTripLegend />
            </div>
          )}

          <ol className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            {roundTrip && origin && (
              <li className="flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-900">
                <OrderBadge kind="departure" />
                <span className="font-medium">{origin}</span>
                <span className="text-xs text-teal-700 dark:text-teal-400">
                  出発
                </span>
              </li>
            )}
            {route.stops.map((stop, stopIndex) => {
              const label = driverChangeBadgeLabel(
                stop.category,
                stop.is_rest_stop
              )
              return (
                <li
                  key={stop.place_id}
                  className="flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-2 last:border-0 dark:border-neutral-900"
                >
                  <OrderBadge kind="stop" index={stopIndex} roundTrip={roundTrip} />
                  <span>{stop.name}</span>
                  {roundTrip && !stop.is_rest_stop && (
                    <span className="rounded bg-teal-50 px-1.5 py-0.5 text-xs text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                      行き
                    </span>
                  )}
                  {label && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      {label}
                    </span>
                  )}

                  {editable && !stop.is_rest_stop && (
                    <label className="flex items-center gap-1 text-xs text-neutral-500">
                      駐車
                      <input
                        type="number"
                        min={0}
                        step={100}
                        defaultValue={stop.parking_yen ?? 0}
                        disabled={!canEdit}
                        key={`${stop.place_id}-${stop.parking_yen}`}
                        onBlur={(e) => {
                          const value = Math.max(
                            0,
                            Math.round(Number(e.target.value) || 0)
                          )
                          if (value !== (stop.parking_yen ?? 0)) {
                            updateParking(stopIndex, value)
                          }
                        }}
                        className="w-20 rounded border border-neutral-300 px-1.5 py-0.5 text-right text-xs dark:border-neutral-700 dark:bg-neutral-900"
                      />
                      円
                      {stop.parking_source === 'manual' && (
                        <span className="text-teal-700 dark:text-teal-400">
                          手動
                        </span>
                      )}
                    </label>
                  )}

                  {editable && (
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="上へ移動"
                        disabled={!canEdit || stopIndex === 0}
                        onClick={() => moveStop(stopIndex, -1)}
                        className="rounded border border-neutral-300 px-1.5 py-0.5 text-xs disabled:opacity-30 dark:border-neutral-700"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="下へ移動"
                        disabled={!canEdit || stopIndex === route.stops.length - 1}
                        onClick={() => moveStop(stopIndex, 1)}
                        className="rounded border border-neutral-300 px-1.5 py-0.5 text-xs disabled:opacity-30 dark:border-neutral-700"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label="削除"
                        disabled={!canEdit || route.stops.length <= 1}
                        onClick={() => removeStop(stopIndex)}
                        className="rounded border border-red-300 px-1.5 py-0.5 text-xs text-red-600 disabled:opacity-30 dark:border-red-900 dark:text-red-400"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </li>
              )
            })}
            {roundTrip && origin && (
              <li className="flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-900">
                <OrderBadge kind="arrival" />
                <span className="font-medium">{origin}</span>
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  帰着
                </span>
              </li>
            )}
          </ol>

          {editable && (
            <p className="mt-2 text-xs text-neutral-500">
              並び替え・削除・追加でルートと費用を自動で再計算します。駐車料金は実際の料金がわかったら上書きできます。
            </p>
          )}

          {origin && (
            <div className="mt-3">
              <OpenInGoogleMapsLink
                origin={origin}
                stops={route.stops.map((stop) => ({
                  lat: stop.lat,
                  lng: stop.lng,
                  name: stop.name,
                }))}
                size="sm"
              />
            </div>
          )}
        </div>
      )}

      {route.sections.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">
            ルート詳細（NAVITIME）
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            {route.sections.map((section, sectionIndex) => (
              <li key={`${section.type}-${sectionIndex}`}>
                [{section.type}] {section.name}
                {section.duration_min != null &&
                  ` · ${formatDuration(section.duration_min)}`}
                {section.distance_km != null && ` · ${section.distance_km} km`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function OrderBadge({
  kind,
  index,
  roundTrip = false,
}: {
  kind: 'departure' | 'arrival' | 'stop'
  index?: number
  roundTrip?: boolean
}) {
  if (kind === 'departure') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
        発
      </span>
    )
  }
  if (kind === 'arrival') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
        帰
      </span>
    )
  }

  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
        roundTrip ? 'bg-teal-600' : 'bg-blue-600'
      }`}
    >
      {(index ?? 0) + 1}
    </span>
  )
}
