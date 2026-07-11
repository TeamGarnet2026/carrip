'use client'

import type { RouteCandidate } from '@/lib/routes/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CostBreakdownPanel } from '@/components/route/cost-breakdown-panel'

type RouteCardProps = {
  route: RouteCandidate
  index: number
  people: number
  isSelected?: boolean
  onClick?: () => void
  showRecommendBadge?: boolean
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

  return (
    <Card isClickable={!!onClick} isSelected={isSelected} onClick={onClick}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{heading}</h3>
        {showRecommendBadge && <Badge variant="info" label="おすすめ" />}
      </div>

      {route.summary && (
        <p className="mb-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {route.summary}
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-neutral-500">総距離</p>
          <p className="font-medium">{route.total_distance_km} km</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">所要時間</p>
          <p className="font-medium">
            {formatDuration(route.total_duration_min)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">総費用</p>
          <p className="font-medium">{formatYen(route.total_cost)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">1人あたり</p>
          <p className="font-medium text-teal-700 dark:text-teal-400">
            {formatYen(route.cost_per_person)}
          </p>
        </div>
      </div>

      <CostBreakdownPanel
        breakdown={route.cost_breakdown}
        people={people}
        compact
      />
    </Card>
  )
}
