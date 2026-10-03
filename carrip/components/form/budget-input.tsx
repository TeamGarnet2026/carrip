'use client'

type BudgetInputProps = {
  value: number | null
  mode: 'per_person' | 'total'
  people: number
  onChange: (value: number | null) => void
  onChangeMode: (mode: 'per_person' | 'total') => void
}

export function BudgetInput({
  value,
  mode,
  people,
  onChange,
  onChangeMode,
}: BudgetInputProps) {
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl bg-neutral-100 p-1">
        <button
          type="button"
          onClick={() => onChangeMode('per_person')}
          className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
            mode === 'per_person'
              ? 'bg-surface text-brand-dark shadow-[0_1px_3px_rgba(15,23,42,0.12)]'
              : 'text-muted hover:text-ink'
          }`}
        >
          1人あたり
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('total')}
          className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
            mode === 'total'
              ? 'bg-surface text-brand-dark shadow-[0_1px_3px_rgba(15,23,42,0.12)]'
              : 'text-muted hover:text-ink'
          }`}
        >
          総額
        </button>
      </div>
      <div>
        <label className="mb-2 block text-[13px] font-bold text-ink">
          予算（任意・未入力は無制限）
        </label>
        <input
          type="number"
          min="0"
          step="1000"
          placeholder="例: 15000"
          value={value ?? ''}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null)
          }
          className="carrip-field min-h-[48px] w-full rounded-xl border border-line px-4 py-2.5 text-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-neutral-300 focus:border-brand focus:ring-4 focus:ring-brand/15"
          style={{
            colorScheme: 'light',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            WebkitTextFillColor: '#0f172a',
          }}
        />
        {value != null && mode === 'total' && (
          <p className="mt-1.5 text-xs text-muted">
            1人あたり約 {Math.ceil(value / people).toLocaleString('ja-JP')} 円
          </p>
        )}
      </div>
    </div>
  )
}
