type StepperProps = {
  value: number
  min: number
  max: number
  label: string
  /** ラベルの下に出す補足 */
  helperText?: string
  /** 数値の後ろに付ける単位（例: 人） */
  unit?: string
  onChange: (value: number) => void
}

const stepButtonClass =
  'grid h-12 w-12 place-items-center rounded-[10px] border border-line-strong bg-surface text-xl text-ink transition hover:bg-soft disabled:opacity-35 disabled:hover:bg-surface'

/** 左にラベル、右に [−] 値 [+] を並べる数量入力 */
export function Stepper({
  value,
  min,
  max,
  label,
  helperText,
  unit = '',
  onChange,
}: StepperProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="m-0 text-sm font-semibold text-ink">{label}</p>
        {helperText && <p className="mt-1 mb-0 text-[13px] text-muted">{helperText}</p>}
      </div>
      <div className="flex items-center gap-3" role="group" aria-label={label}>
        <button
          type="button"
          className={stepButtonClass}
          aria-label={`${label}を減らす`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span
          className="min-w-14 text-center text-2xl font-semibold text-ink tabular-nums"
          aria-live="polite"
        >
          {value}
          {unit}
        </span>
        <button
          type="button"
          className={stepButtonClass}
          aria-label={`${label}を増やす`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          ＋
        </button>
      </div>
    </div>
  )
}
