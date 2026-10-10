'use client'

import { useState, type ReactNode } from 'react'
import { CostTiles } from '@/components/route/cost-tiles'
import { ItineraryList } from '@/components/route/itinerary-list'
import { ExternalIcon, PlusIcon } from '@/components/ui/icons'
import { formatDuration, formatYen } from '@/lib/format'
import { buildGoogleMapsDirectionsUrl } from '@/lib/maps/google-maps-directions-url'
import {
  computeRoundTripLegDurations,
  isRoundTripRoute,
} from '@/lib/maps/round-trip-display'
import { buildItinerary } from '@/lib/routes/itinerary'
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
  /** パネル上部に表示する地図 */
  map?: ReactNode
  /** 条件入力で決めた出発時刻（ルートに時刻がないとき使う） */
  departureTime?: string
  fuelKmL?: number
}

/** 選んだルートの詳細（地図・総費用・費用4項目・立ち寄り順） */
export function RouteDetailPanel({
  route,
  index,
  origin = '出発地',
  people = 2,
  editable = false,
  recalculating = false,
  addableStops = [],
  onStopsChange,
  showIndexLabel = true,
  map,
  departureTime,
  fuelKmL,
}: RouteDetailPanelProps) {
  const [showAddList, setShowAddList] = useState(false)

  const canEdit = editable && onStopsChange != null && !recalculating
  const roundTrip = isRoundTripRoute(route)
  const legDurations = roundTrip ? computeRoundTripLegDurations(route) : null
  const itinerary = buildItinerary(route, departureTime)
  const endTime = itinerary.at(-1)?.time
  const directions = buildGoogleMapsDirectionsUrl({
    origin,
    stops: route.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng, name: stop.name })),
  })

  const availableToAdd = addableStops.filter(
    (candidate) => !route.stops.some((stop) => stop.place_id === candidate.place_id)
  )

  function addStop(stop: RouteStop) {
    if (!canEdit) return
    setShowAddList(false)
    onStopsChange!([...route.stops, stop], true)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {map && (
        <div className="relative border-b border-line bg-sunken">
          {map}
          {directions && (
            <a
              href={directions.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-4 right-4 z-[500] flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-[13px] font-medium text-ink no-underline shadow-[var(--shadow-carrip)] hover:bg-soft"
            >
              Googleマップで開く
              <ExternalIcon className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 p-5 md:p-8">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="m-0 text-[13px] text-muted">
              {showIndexLabel ? `案${index + 1} · ` : ''}総費用
            </p>
            <p className="mt-1 mb-0 text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
              {formatYen(route.total_cost)}
            </p>
          </div>
          <dl className="m-0 flex gap-8 text-[13px]">
            {legDurations ? (
              <>
                <div>
                  <dt className="text-muted">行き</dt>
                  <dd className="m-0 mt-1 text-base font-semibold">
                    {formatDuration(legDurations.outboundMin)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">帰り</dt>
                  <dd className="m-0 mt-1 text-base font-semibold">
                    {formatDuration(legDurations.returnMin)}
                  </dd>
                </div>
              </>
            ) : (
              <div>
                <dt className="text-muted">運転時間</dt>
                <dd className="m-0 mt-1 text-base font-semibold">
                  {formatDuration(route.total_duration_min)}
                </dd>
              </div>
            )}
            {endTime && (
              <div>
                <dt className="text-muted">{roundTrip ? '帰着' : '到着'}</dt>
                <dd className="m-0 mt-1 text-base font-semibold tabular-nums">{endTime}</dd>
              </div>
            )}
          </dl>
          {recalculating && (
            <p className="m-0 flex items-center gap-2 text-[13px] text-brand" role="status">
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden
              />
              費用を計算し直しています…
            </p>
          )}
        </div>

        <CostTiles route={route} people={people} fuelKmL={fuelKmL} />

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0 text-lg font-bold">立ち寄り順</h3>
            {editable && availableToAdd.length > 0 && (
              <button
                type="button"
                disabled={!canEdit}
                aria-expanded={showAddList}
                onClick={() => setShowAddList((current) => !current)}
                className="flex min-h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[13px] font-medium hover:bg-soft disabled:opacity-40"
              >
                <PlusIcon className="h-4 w-4" />
                {showAddList ? '閉じる' : '立ち寄りを追加'}
              </button>
            )}
          </div>

          {showAddList && (
            <ul className="mt-0 mb-4 flex list-none flex-col gap-2 rounded-xl border border-dashed border-line-strong p-3">
              {availableToAdd.map((candidate) => (
                <li key={candidate.place_id} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{candidate.name}</span>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => addStop(candidate)}
                    className="min-h-8 rounded-lg border border-line-strong px-3 text-[13px] hover:bg-soft disabled:opacity-40"
                  >
                    追加
                  </button>
                </li>
              ))}
            </ul>
          )}

          <ItineraryList
            route={route}
            origin={origin}
            people={people}
            departureTime={departureTime}
            onStopsChange={editable ? onStopsChange : undefined}
            disabled={!canEdit}
          />

          {editable && (
            <p className="mt-4 mb-0 text-[13px] text-muted">
              ドラッグ（または ↑↓）で並び替えできます。変更すると費用を自動で計算し直します。
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
