'use client'

import { CostBar, COST_ITEMS } from '@/components/route/cost-bar'
import { Badge } from '@/components/ui/badge'
import { formatYen } from '@/lib/format'
import { formatRouteDuration } from '@/lib/maps/round-trip-display'
import type { RouteCandidate } from '@/lib/routes/types'

type RouteCardProps = {
  route: RouteCandidate
  index: number
  people: number
  isSelected?: boolean
  onClick?: () => void
  showRecommendBadge?: boolean
  showIndexLabel?: boolean
  /** 1人あたり予算を超えているとき true */
  overBudget?: boolean
  /** スマホで選ばれていない案を1行にまとめる */
  collapsed?: boolean
}

/** ルート候補のカード（案N・1人あたり料金・時間と距離・費用の内訳バー） */
export function RouteCard({
  route,
  index,
  people,
  isSelected = false,
  onClick,
  showRecommendBadge = false,
  showIndexLabel = true,
  overBudget = false,
  collapsed = false,
}: RouteCardProps) {
  const heading = showIndexLabel ? `案${index + 1} · ${route.title}` : route.title
  const meta = `${formatRouteDuration(route)} · ${route.total_distance_km} km`
  const interactive = onClick != null

  const content = collapsed ? (
    <span className="flex items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block truncate text-base font-bold">{heading}</span>
        <span className="mt-1 block text-[13px] text-muted">
          {meta}
          {route.cost_breakdown.toll === 0 && ' · 高速代なし'}
        </span>
      </span>
      <span className="text-2xl font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums">
        {formatYen(route.cost_per_person)}
      </span>
    </span>
  ) : (
    <span className="flex flex-col gap-4">
      <span className="flex items-center gap-2.5">
        {interactive && (
          <span
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
              isSelected ? 'border-ink' : 'border-line-strong'
            }`}
            aria-hidden
          >
            {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-base font-bold">{heading}</span>
        {showRecommendBadge && <Badge variant="success" label="おすすめ" />}
        {overBudget && <Badge variant="danger" label="予算オーバー" />}
      </span>
      <span className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <span className="text-[40px] leading-none font-semibold tracking-[-0.03em] tabular-nums md:text-[44px]">
          {formatYen(route.cost_per_person)}
          <span className="ml-1 text-sm font-normal tracking-normal text-muted">/ 1人</span>
        </span>
        <span className="text-[13px] text-muted">{meta}</span>
      </span>
      <CostBar breakdown={route.cost_breakdown} className="h-1.5" />
      {/* スマホでは内訳の数字も並べる */}
      <span className="grid grid-cols-4 gap-2 md:hidden">
        {COST_ITEMS.map((item) => (
          <span key={item.key}>
            <span className="block text-xs text-muted">{item.short}</span>
            <span className="block text-sm font-medium tabular-nums">
              {formatYen(route.cost_breakdown[item.key])}
            </span>
          </span>
        ))}
      </span>
    </span>
  )

  const className = `block w-full rounded-2xl bg-surface p-5 text-left text-ink transition ${
    isSelected ? 'border-[1.5px] border-ink' : 'border border-line'
  } ${interactive ? 'cursor-pointer hover:border-muted' : ''}`

  if (!interactive) {
    return <div className={className}>{content}</div>
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`${heading}、1人あたり${route.cost_per_person.toLocaleString('ja-JP')}円、${people}人`}
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  )
}
