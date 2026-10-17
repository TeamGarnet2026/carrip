'use client'

import { PREFERENCE_OPTIONS } from '@/lib/plan/constants'

type PreferenceSelectorProps = {
  value: string[]
  onChange: (value: string[]) => void
}

/** 重視したいこと（複数選択のチェックボックス） */
export function PreferenceSelector({ value, onChange }: PreferenceSelectorProps) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id))
      return
    }
    onChange([...value, id])
  }

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-3 p-0 text-sm font-semibold">重視したいこと（複数選択可）</legend>
      <div className="flex flex-wrap gap-3">
        {PREFERENCE_OPTIONS.map((option) => (
          <label key={option.id} className="carrip-option">
            <input
              type="checkbox"
              checked={value.includes(option.id)}
              onChange={() => toggle(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
