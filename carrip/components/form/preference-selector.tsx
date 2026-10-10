'use client'

import { PREFERENCE_OPTIONS } from '@/lib/plan/constants'

type PreferenceSelectorProps = {
  value: string[]
  onChange: (value: string[]) => void
}

export function PreferenceSelector({ value, onChange }: PreferenceSelectorProps) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id))
      return
    }
    onChange([...value, id])
  }

  return (
    <div>
      <p className="mb-2 text-[13px] font-bold text-ink">優先軸（複数選択可）</p>
      <div className="flex flex-wrap gap-2">
        {PREFERENCE_OPTIONS.map((option) => {
          const selected = value.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                selected
                  ? 'border-brand bg-brand text-white shadow-[0_4px_12px_rgba(15,138,126,0.25)]'
                  : 'border-line bg-surface text-ink hover:border-teal-300'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
