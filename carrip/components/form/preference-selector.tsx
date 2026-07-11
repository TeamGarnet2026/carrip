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
      <p className="mb-2 text-sm font-medium">優先軸（複数選択可）</p>
      <div className="flex flex-wrap gap-2">
        {PREFERENCE_OPTIONS.map((option) => {
          const selected = value.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                selected
                  ? 'border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-950 dark:text-teal-200'
                  : 'border-neutral-300 hover:border-teal-500 dark:border-neutral-700'
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
