'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CostBar, COST_ITEMS } from '@/components/route/cost-bar'
import { ItineraryList } from '@/components/route/itinerary-list'
import { TripDeleteButton } from '@/components/trip/trip-delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalIcon } from '@/components/ui/icons'
import { formatJapaneseDate, formatTripLength, formatYen } from '@/lib/format'
import { buildGoogleMapsDirectionsUrl } from '@/lib/maps/google-maps-directions-url'
import { VEHICLE_PRESETS } from '@/lib/plan/constants'
import { planDisplayName } from '@/lib/plan/display-name'
import { tripDetailToCandidates, type TripDetail } from '@/lib/trips/to-route-candidate'
import type { Tables } from '@/types/supabase'

const RoutesMap = dynamic(
  () => import('@/components/routes/routes-map').then((mod) => mod.RoutesMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] items-center justify-center text-sm text-muted">
        地図を読み込み中…
      </div>
    ),
  }
)

type TripDetailViewProps = {
  detail: TripDetail
}

function vehicleLabel(vehicleJson: Tables<'trips'>['vehicle_json']): string | null {
  if (!vehicleJson || typeof vehicleJson !== 'object' || Array.isArray(vehicleJson)) {
    return null
  }
  const type = 'type' in vehicleJson ? String(vehicleJson.type) : ''
  return (
    VEHICLE_PRESETS.find((item) => item.id === type)?.label.replace('（電気自動車）', '') ??
    (type || null)
  )
}

/** 保存したプランの詳細（PC_13 / SP_11） */
export function TripDetailView({ detail }: TripDetailViewProps) {
  const { trip } = detail
  const routes = useMemo(() => tripDetailToCandidates(detail), [detail])
  const [selectedRouteId, setSelectedRouteId] = useState(() => routes[0]?.id ?? null)

  const selectedRoute = routes.find((route) => route.id === selectedRouteId)
  const name = planDisplayName(trip.prefecture ?? [], trip.days)
  const vehicle = vehicleLabel(trip.vehicle_json)
  const meta = [
    `${trip.origin} 出発`,
    formatJapaneseDate(trip.departure_date),
    formatTripLength(trip.days),
    `${trip.people}人`,
    vehicle,
  ]
    .filter(Boolean)
    .join(' · ')
  const tripLabel = `${trip.origin} → ${trip.prefecture.join('、')}`
  const directions = selectedRoute
    ? buildGoogleMapsDirectionsUrl({
        origin: trip.origin,
        stops: selectedRoute.stops.map((stop) => ({
          lat: stop.lat,
          lng: stop.lng,
          name: stop.name,
        })),
      })
    : null

  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="パンくずリスト" className="text-sm text-ink-soft">
        <Link href="/trips" prefetch={false}>
          マイプラン
        </Link>
        <span className="mx-3 text-muted" aria-hidden>
          /
        </span>
        <span>{name}</span>
      </nav>

      <div className="carrip-photo hidden h-[280px] md:block" aria-hidden />

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-3">
          <Badge variant="success" label="保存済み" />
          <h1 className="m-0 text-[28px] leading-tight font-bold md:text-[34px]">{name}</h1>
          <p className="m-0 text-[15px] text-ink-soft">{meta}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TripDeleteButton tripId={trip.id} tripLabel={tripLabel} label="削除" />
          {directions && (
            <a href={directions.url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                Googleマップで開く
                <ExternalIcon className="h-4 w-4" />
              </Button>
            </a>
          )}
          {selectedRouteId && (
            <Link href={`/plan/${trip.id}/share?routeId=${selectedRouteId}`}>
              <Button>LINEで共有</Button>
            </Link>
          )}
        </div>
      </div>

      {!selectedRoute ? (
        <div className="carrip-panel border-dashed p-8 text-sm text-ink-soft">
          このプランにはルート情報が保存されていません。
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
          <section className="rounded-2xl border border-line bg-surface p-6 md:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-xl font-bold">旅程</h2>
              {routes.length > 1 && (
                <div role="group" aria-label="ルート" className="flex gap-0.5 rounded-[10px] bg-segment p-1">
                  {routes.map((route, index) => (
                    <button
                      key={route.id}
                      type="button"
                      aria-pressed={route.id === selectedRouteId}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`min-h-9 rounded-lg px-4 text-[13px] ${
                        route.id === selectedRouteId ? 'bg-surface font-medium' : ''
                      }`}
                    >
                      案{index + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ItineraryList
              route={selectedRoute}
              origin={trip.origin}
              people={trip.people}
              showTimes={false}
            />
          </section>

          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-line bg-surface p-6 md:p-8">
              <p className="m-0 text-[13px] text-muted">1人あたり（{trip.people}人）</p>
              <p className="mt-2 mb-5 text-[40px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {formatYen(selectedRoute.cost_per_person)}
              </p>
              <CostBar breakdown={selectedRoute.cost_breakdown} className="h-1.5" />
              <dl className="m-0 mt-5 flex flex-col gap-2.5 text-[15px]">
                {COST_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-ink-soft">
                      <span className={`h-2 w-2 rounded-full ${item.bar}`} aria-hidden />
                      {item.label}
                    </dt>
                    <dd className="m-0 tabular-nums">
                      {formatYen(selectedRoute.cost_breakdown[item.key])}
                    </dd>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between border-t border-line pt-4 font-semibold">
                  <dt>総費用</dt>
                  <dd className="m-0 tabular-nums">{formatYen(selectedRoute.total_cost)}</dd>
                </div>
              </dl>
            </section>
            <section aria-label="地図" className="overflow-hidden rounded-2xl border border-line bg-surface">
              <RoutesMap
                routes={routes}
                selectedRouteId={selectedRoute.id}
                onSelectRoute={setSelectedRouteId}
                originLabel={trip.origin}
              />
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
