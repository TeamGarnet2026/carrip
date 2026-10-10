import type { CostBreakdown } from '@/lib/routes/types'

export const COST_ITEMS = [
  { key: 'fuel', label: '燃料費', short: '燃料', bar: 'bg-cost-fuel' },
  { key: 'toll', label: '高速', short: '高速', bar: 'bg-cost-toll' },
  { key: 'parking', label: '駐車', short: '駐車', bar: 'bg-cost-parking' },
  { key: 'admission', label: '入場', short: '入場', bar: 'bg-cost-admission' },
] as const

type CostBarProps = {
  breakdown: CostBreakdown
  className?: string
}

/** 費用4項目の割合を色で見せる横棒 */
export function CostBar({ breakdown, className = 'h-1.5' }: CostBarProps) {
  const total = COST_ITEMS.reduce((sum, item) => sum + breakdown[item.key], 0)
  return (
    <div
      className={`flex gap-[3px] overflow-hidden rounded-full ${className}`}
      role="img"
      aria-label={COST_ITEMS.map(
        (item) => `${item.label} ¥${breakdown[item.key].toLocaleString('ja-JP')}`
      ).join('、')}
    >
      {COST_ITEMS.map((item) =>
        total === 0 || breakdown[item.key] > 0 ? (
          <span
            key={item.key}
            className={`rounded-full ${item.bar}`}
            style={{ flexGrow: total > 0 ? breakdown[item.key] : 1 }}
          />
        ) : null
      )}
    </div>
  )
}

/** 色の凡例（● 燃料費 ● 高速 …） */
export function CostLegend() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[13px] text-ink-soft">
      {COST_ITEMS.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${item.bar}`} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
