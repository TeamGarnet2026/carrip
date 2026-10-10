import { COST_ITEMS } from '@/components/route/cost-bar'
import { formatYen } from '@/lib/format'
import { describeCostSources } from '@/lib/routes/cost-sources'
import type { RouteCandidate } from '@/lib/routes/types'

type CostTilesProps = {
  route: Pick<RouteCandidate, 'cost_breakdown' | 'cost_sources' | 'stops' | 'total_distance_km'>
  people: number
  /** 車の燃費（km/L）。わかるときだけ燃料費の補足に出す */
  fuelKmL?: number
}

/** 燃料費・高速・駐車・入場の4つのタイル（金額 + 根拠の一言） */
export function CostTiles({ route, people, fuelKmL }: CostTilesProps) {
  const sources = describeCostSources(route.cost_sources)
  const touristStops = route.stops.filter((stop) => !stop.is_rest_stop).length
  const notes: Record<(typeof COST_ITEMS)[number]['key'], string> = {
    fuel: fuelKmL
      ? `${route.total_distance_km} km ÷ ${fuelKmL} km/L`
      : sources.fuel.label,
    toll: sources.toll.label,
    parking: touristStops > 0 ? `${touristStops}か所 · ${sources.parking.label}` : 'なし',
    admission: `${people}人分`,
  }

  return (
    <dl className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {COST_ITEMS.map((item) => (
        <div key={item.key} className="rounded-xl bg-soft p-4">
          <dt className="flex items-center gap-1.5 text-[13px] text-ink-soft">
            <span className={`h-2 w-2 rounded-full ${item.bar}`} aria-hidden />
            {item.label}
          </dt>
          <dd className="mt-2 mb-0 text-xl font-semibold tabular-nums">
            {formatYen(route.cost_breakdown[item.key])}
          </dd>
          <dd className="mt-1 mb-0 truncate text-xs text-muted">{notes[item.key]}</dd>
        </div>
      ))}
    </dl>
  )
}
