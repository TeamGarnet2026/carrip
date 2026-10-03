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
      <label className="mb-1.5 block text-xs font-extrabold text-muted">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </Button>
        <span className="min-w-16 text-center text-lg font-black text-ink">
          {value}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          ＋
        </Button>
      </div>
    </div>
  )
}
