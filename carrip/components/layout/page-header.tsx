import Link from 'next/link'
import { Button } from '@/components/ui/button'

type PageHeaderProps = {
  title: string
  showBack?: boolean
  backHref?: string
  rightAction?: React.ReactNode
}

export function PageHeader({
  title,
  showBack = false,
  backHref = '/',
  rightAction,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {showBack && (
          <Link
            href={backHref}
            className="text-sm font-extrabold text-brand-dark underline"
          >
            戻る
          </Link>
        )}
        <h1 className="text-2xl font-black tracking-tight text-ink">{title}</h1>
      </div>
      {rightAction}
    </div>
  )
}

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
