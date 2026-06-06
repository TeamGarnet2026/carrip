'use client'

import type { RouteCandidate } from '@/lib/routes/types'

type RouteDetailPanelProps = {
  route: RouteCandidate
  index: number
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

export function RouteDetailPanel({ route, index }: RouteDetailPanelProps) {
  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="font-medium">
          案{index + 1}: {route.title}
        </p>
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          🚗 車移動のみ
        </span>
      </div>

      {route.summary && (
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {route.summary}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
          <p className="mb-2 font-medium">費用内訳</p>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-400">
            <li>燃料費: {formatYen(route.cost_breakdown.fuel)}</li>
            <li>高速料金: {formatYen(route.cost_breakdown.toll)}</li>
            <li>駐車料金: {formatYen(route.cost_breakdown.parking)}</li>
            <li>入場料: {formatYen(route.cost_breakdown.admission)}</li>
          </ul>
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
          <p className="mb-2 text-sm font-medium">立ち寄り地点</p>
          <ol className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            {route.stops.map((stop, stopIndex) => (
              <li key={stop.place_id}>
                {stopIndex + 1}. {stop.name}
              </li>
            ))}
          </ol>
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
