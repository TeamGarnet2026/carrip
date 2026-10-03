import { Button } from '@/components/ui/button'

type StepperProps = {
  value: number
  min: number
  max: number
  label: string
  onChange: (value: number) => void
}

export function Stepper({ value, min, max, label, onChange }: StepperProps) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-bold text-ink">
        {label}
      </label>
      <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${label}を減らす`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </Button>
        <span className="min-w-14 text-center text-lg font-bold text-ink tabular-nums">
          {value}
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${label}を増やす`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          ＋
        </Button>
      </div>
    </div>
  )
}
