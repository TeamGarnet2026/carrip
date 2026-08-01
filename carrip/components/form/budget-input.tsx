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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChangeMode('per_person')}
          className={`rounded-full px-3 py-1 text-sm ${
            mode === 'per_person'
              ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-neutral-950'
              : 'border border-neutral-300 dark:border-neutral-700'
          }`}
        >
          1人あたり
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('total')}
          className={`rounded-full px-3 py-1 text-sm ${
            mode === 'total'
              ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-neutral-950'
              : 'border border-neutral-300 dark:border-neutral-700'
          }`}
        >
          総額
        </button>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
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
          className="carrip-field w-full rounded-lg border border-line px-3 py-2 text-sm"
          style={{
            colorScheme: 'light',
            backgroundColor: '#ffffff',
            color: '#1f2a37',
            WebkitTextFillColor: '#1f2a37',
          }}
        />
        {value != null && mode === 'total' && (
          <p className="mt-1 text-xs text-neutral-500">
            1人あたり約 {Math.ceil(value / people).toLocaleString('ja-JP')} 円
          </p>
        )}
      </div>
    </div>
  )
}
