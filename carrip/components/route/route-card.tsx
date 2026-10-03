'use client'

import type { RouteCandidate } from '@/lib/routes/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CostBreakdownPanel } from '@/components/route/cost-breakdown-panel'
import {
  computeRoundTripLegDurations,
  formatDurationMinutes,
  formatRouteDuration,
  isRoundTripRoute,
} from '@/lib/maps/round-trip-display'

type RouteCardProps = {
  route: RouteCandidate
  index: number
  people: number
  isSelected?: boolean
  onClick?: () => void
  showRecommendBadge?: boolean
  showIndexLabel?: boolean
}

function formatYen(amount: number): string {
  return `${amount.toLocaleString('ja-JP')}円`
}

export function RouteCard({
  route,
  index,
  people,
  isSelected = false,
  onClick,
  showRecommendBadge = true,
  showIndexLabel = true,
}: RouteCardProps) {
  const heading = showIndexLabel
    ? `案${index + 1}: ${route.title}`
    : route.title
  const roundTrip = isRoundTripRoute(route)
  const legDurations = roundTrip ? computeRoundTripLegDurations(route) : null

  return (
    <Card
      isClickable={!!onClick}
      isSelected={isSelected}
      onClick={onClick}
      className="flex h-full flex-col"
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-base font-bold text-ink">{heading}</h3>
        {showRecommendBadge && <Badge variant="info" label="おすすめ" />}
        {isSelected && (
          <span className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">
            ✓
          </span>
        )}
      </div>

      {route.summary && (
        <p className="m-0 text-[13px] leading-relaxed text-muted">
          {route.summary}
        </p>
      )}

      <div className="my-4 flex items-end justify-between gap-3 rounded-xl bg-soft px-4 py-3">
        <div>
          <p className="m-0 text-xs font-bold text-muted">1人あたり</p>
          <p className="m-0 text-2xl leading-tight font-bold tracking-tight text-brand-dark tabular-nums">
            {formatYen(route.cost_per_person)}
          </p>
        </div>
        <p className="m-0 text-right text-xs text-muted">
          総費用
          <span className="block text-sm font-bold text-ink tabular-nums">
            {formatYen(route.total_cost)}
          </span>
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="m-0 text-xs text-muted">総距離</p>
          <p className="m-0 font-bold tabular-nums">{route.total_distance_km} km</p>
        </div>
        <div>
          <p className="m-0 text-xs text-muted">所要時間</p>
          {legDurations ? (
            <div className="space-y-0.5 font-bold tabular-nums">
              <p className="m-0">行 {formatDurationMinutes(legDurations.outboundMin)}</p>
              <p className="m-0">帰 {formatDurationMinutes(legDurations.returnMin)}</p>
            </div>
          ) : (
            <p className="m-0 font-bold tabular-nums">{formatRouteDuration(route)}</p>
          )}
        </div>
      </div>

      <div className="mt-auto" />

      <CostBreakdownPanel
        breakdown={route.cost_breakdown}
        people={people}
        compact
      />
    </Card>
  )
}
