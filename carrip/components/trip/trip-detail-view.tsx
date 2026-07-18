'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { RouteCard } from '@/components/route/route-card'
import { RouteDetailPanel } from '@/components/routes/route-detail-panel'
import { TripDeleteButton } from '@/components/trip/trip-delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VEHICLE_PRESETS } from '@/lib/plan/constants'
import {
  tripDetailToCandidates,
  type TripDetail,
} from '@/lib/trips/to-route-candidate'
import type { Tables } from '@/types/supabase'

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

type TripDetailViewProps = {
  detail: TripDetail
}

function vehicleLabel(vehicleJson: Tables<'trips'>['vehicle_json']): string {
  if (!vehicleJson || typeof vehicleJson !== 'object' || Array.isArray(vehicleJson)) {
    return '未設定'
  }
  const type = 'type' in vehicleJson ? String(vehicleJson.type) : ''
  return VEHICLE_PRESETS.find((item) => item.id === type)?.label ?? type
}

export function TripDetailView({ detail }: TripDetailViewProps) {
  const { trip } = detail
  const routes = useMemo(() => tripDetailToCandidates(detail), [detail])
  const [selectedRouteId, setSelectedRouteId] = useState(
    () => routes[0]?.id ?? null
  )

  const selectedRoute = routes.find((route) => route.id === selectedRouteId)
  const selectedIndex = routes.findIndex((route) => route.id === selectedRouteId)

  if (routes.length === 0) {
    return (
      <div className="space-y-6">
        <TripHeader trip={trip} />
        <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          このプランにはルート情報が保存されていません。
        </div>
        <TripDeleteButton
          tripId={trip.id}
          tripLabel={`${trip.origin} → ${trip.prefecture.join('、')}`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TripHeader trip={trip} />

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {routes.length}件のルート · {trip.origin} 出発
      </p>

      <div className="space-y-4">
        {routes.map((route, index) => (
          <RouteCard
            key={route.id}
            route={route}
            index={index}
            people={trip.people}
            isSelected={route.id === selectedRouteId}
            onClick={() => setSelectedRouteId(route.id)}
            showRecommendBadge={false}
            showIndexLabel={routes.length > 1}
          />
        ))}
      </div>

      {selectedRouteId && (
        <RoutesMap
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          originLabel={trip.origin}
        />
      )}

      {selectedRoute && selectedIndex >= 0 && (
        <RouteDetailPanel
          route={selectedRoute}
          index={selectedIndex}
          origin={trip.origin}
          people={trip.people}
          showIndexLabel={routes.length > 1}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <Link href={`/plan/${trip.id}/share?routeId=${selectedRouteId ?? routes[0].id}`}>
          <Button variant="secondary">LINEで共有</Button>
        </Link>
        <TripDeleteButton
          tripId={trip.id}
          tripLabel={`${trip.origin} → ${trip.prefecture.join('、')}`}
        />
      </div>
    </div>
  )
}

function TripHeader({ trip }: { trip: Tables<'trips'> }) {
  return (
    <div>
      <Badge variant="neutral" label="保存済みプラン" />
      <h1 className="mt-3 text-2xl font-bold">
        {trip.origin} → {trip.prefecture.join('、')}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {trip.departure_date} 出発 · {trip.days}日間 · {trip.people}人 ·{' '}
        {vehicleLabel(trip.vehicle_json)}
      </p>
    </div>
  )
}
