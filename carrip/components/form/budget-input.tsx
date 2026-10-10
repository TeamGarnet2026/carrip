'use client'

import { useId } from 'react'

type BudgetInputProps = {
  value: number | null
  mode: 'per_person' | 'total'
  people: number
  onChange: (value: number | null) => void
  onChangeMode: (mode: 'per_person' | 'total') => void
}

const MODES = [
  { id: 'per_person', label: '1人あたり' },
  { id: 'total', label: '総額' },
] as const

/** 予算（1人あたり / 総額の切り替え + 金額） */
export function BudgetInput({
  value,
  mode,
  people,
  onChange,
  onChangeMode,
}: BudgetInputProps) {
  const inputId = useId()

  return (
    <div>
      <label htmlFor={inputId} className="mb-3 block text-sm font-semibold">
        予算
      </label>
      <div className="flex flex-wrap gap-3">
        <div role="group" aria-label="予算の単位" className="flex gap-0.5 rounded-[10px] bg-segment p-1">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              onClick={() => onChangeMode(item.id)}
              className={`min-h-11 rounded-lg px-4 text-sm transition ${
                mode === item.id
                  ? 'bg-surface font-semibold text-ink'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">
            ¥
          </span>
          <input
            id={inputId}
            type="number"
            min="0"
            step="1000"
            placeholder="5,000"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className="carrip-field min-h-[52px] w-full rounded-[10px] border border-line-strong pr-4 pl-9 text-base outline-none focus:border-ink focus:ring-1 focus:ring-ink"
            style={{
              colorScheme: 'light',
              backgroundColor: '#ffffff',
              color: '#1b1d1c',
              WebkitTextFillColor: '#1b1d1c',
            }}
          />
        </div>
      </div>
      <p className="mt-2 mb-0 text-[13px] text-muted">
        {value != null && mode === 'total'
          ? `1人あたり約 ¥${Math.ceil(value / people).toLocaleString('ja-JP')}。`
          : ''}
        未入力なら上限なし。超えたルートには目印が付きます
      </p>
    </div>
  )
}
