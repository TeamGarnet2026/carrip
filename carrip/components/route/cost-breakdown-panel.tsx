import {
  deltaTextClass,
  formatYenDelta,
  type CostDiff,
} from '@/lib/routes/cost-diff'
import {
  describeCostSources,
  type CostConfidence,
} from '@/lib/routes/cost-sources'
import type { CostBreakdown, CostSources } from '@/lib/routes/types'

type CostBreakdownPanelProps = {
  breakdown: CostBreakdown
  people: number
  compact?: boolean
  sources?: CostSources
  /** 直前の編集からの差分。指定すると増加を赤・減少を緑で表示する */
  diff?: CostDiff | null
}

function formatYen(amount: number): string {
  return `${amount.toLocaleString('ja-JP')}円`
}

function confidenceClass(confidence: CostConfidence): string {
  switch (confidence) {
    case 'high':
      return 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
    case 'medium':
      return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
    case 'low':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  }
}

export function CostBreakdownPanel({
  breakdown,
  people,
  compact = false,
  sources,
  diff,
}: CostBreakdownPanelProps) {
  const total = breakdown.fuel + breakdown.toll + breakdown.parking + breakdown.admission
  const sourceInfo = sources ? describeCostSources(sources) : null
  const items = [
    { key: 'fuel' as const, label: '燃料費', value: breakdown.fuel, color: 'bg-amber-400' },
    { key: 'toll' as const, label: '高速', value: breakdown.toll, color: 'bg-sky-400' },
    { key: 'parking' as const, label: '駐車', value: breakdown.parking, color: 'bg-violet-400' },
    { key: 'admission' as const, label: '入場', value: breakdown.admission, color: 'bg-emerald-400' },
  ]

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        {items.map((item) => (
          <div
            key={item.label}
            className={item.color}
            style={{ width: `${total > 0 ? (item.value / total) * 100 : 25}%` }}
            title={`${item.label}: ${formatYen(item.value)}`}
          />
        ))}
      </div>
      <ul className={`grid gap-2 ${compact ? 'grid-cols-2 text-xs' : 'grid-cols-1 text-sm sm:grid-cols-2'}`}>
        {items.map((item) => {
          const source = sourceInfo?.[item.key]
          return (
            <li key={item.label} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                {item.label}
                {!compact && source && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] leading-tight ${confidenceClass(source.confidence)}`}
                  >
                    {source.label}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                {diff != null && diff[item.key] !== 0 && (
                  <span className={`text-xs font-medium ${deltaTextClass(diff[item.key])}`}>
                    {formatYenDelta(diff[item.key])}
                  </span>
                )}
                {formatYen(item.value)}
              </span>
            </li>
          )
        })}
      </ul>
      {!compact && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          1人あたり約 {formatYen(Math.ceil(total / people))}
          {diff != null && diff.per_person !== 0 && (
            <span className={`ml-2 text-xs font-medium ${deltaTextClass(diff.per_person)}`}>
              {formatYenDelta(diff.per_person)}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
