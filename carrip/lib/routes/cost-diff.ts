import type { CostBreakdown, RouteCandidate } from '@/lib/routes/types'

export type CostDiff = CostBreakdown & {
  total: number
  per_person: number
}

export type DeltaTone = 'increase' | 'decrease' | 'none'

/** 立ち寄り地点の変更前後で、費用の各項目がいくら増減したかを返す */
export function diffRouteCosts(
  previous: Pick<RouteCandidate, 'cost_breakdown' | 'total_cost' | 'cost_per_person'>,
  next: Pick<RouteCandidate, 'cost_breakdown' | 'total_cost' | 'cost_per_person'>
): CostDiff {
  return {
    fuel: next.cost_breakdown.fuel - previous.cost_breakdown.fuel,
    toll: next.cost_breakdown.toll - previous.cost_breakdown.toll,
    parking: next.cost_breakdown.parking - previous.cost_breakdown.parking,
    admission: next.cost_breakdown.admission - previous.cost_breakdown.admission,
    total: next.total_cost - previous.total_cost,
    per_person: next.cost_per_person - previous.cost_per_person,
  }
}

export function hasCostChange(diff: CostDiff): boolean {
  return (
    diff.total !== 0 ||
    diff.fuel !== 0 ||
    diff.toll !== 0 ||
    diff.parking !== 0 ||
    diff.admission !== 0
  )
}

export function deltaTone(delta: number): DeltaTone {
  if (delta > 0) return 'increase'
  if (delta < 0) return 'decrease'
  return 'none'
}

/** 差分金額を符号付きで表示する（例: +1,200円 / −800円 / ±0円） */
export function formatYenDelta(delta: number): string {
  const amount = Math.abs(delta).toLocaleString('ja-JP')
  if (delta > 0) return `+${amount}円`
  if (delta < 0) return `−${amount}円`
  return '±0円'
}

/** 増加は赤、減少は緑で表示する */
export function deltaTextClass(delta: number): string {
  switch (deltaTone(delta)) {
    case 'increase':
      return 'text-red-600 dark:text-red-400'
    case 'decrease':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'none':
      return 'text-neutral-500'
  }
}
