type RoundTripLegendProps = {
  className?: string
}

export function RoundTripLegend({ className = '' }: RoundTripLegendProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400 ${className}`}
    >
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-1 w-8 rounded-full"
          style={{ backgroundColor: '#0d9488' }}
        />
        行き
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-1 w-8 rounded-full border border-dashed border-amber-500"
          style={{ backgroundColor: '#f59e0b' }}
        />
        帰り
      </span>
      <span className="flex items-center gap-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
          発
        </span>
        出発
      </span>
      <span className="flex items-center gap-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
          帰
        </span>
        帰着
      </span>
    </div>
  )
}
