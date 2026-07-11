'use client'

import { PREFECTURES } from '@/lib/plan/constants'

type PrefectureTagInputProps = {
  value: string[]
  maxCount?: number
  onChange: (value: string[]) => void
}

export function PrefectureTagInput({
  value,
  maxCount = 5,
  onChange,
}: PrefectureTagInputProps) {
  const atMax = value.length >= maxCount

  function toggle(prefecture: string) {
    if (value.includes(prefecture)) {
      onChange(value.filter((item) => item !== prefecture))
      return
    }
    if (atMax) return
    onChange([...value, prefecture])
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        訪問都道府県（{value.length}/{maxCount}）
      </p>
      <div className="flex flex-wrap gap-2">
        {PREFECTURES.map((prefecture) => {
          const selected = value.includes(prefecture)
          const disabled = !selected && atMax
          return (
            <button
              key={prefecture}
              type="button"
              disabled={disabled}
              onClick={() => toggle(prefecture)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                selected
                  ? 'border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-950 dark:text-teal-200'
                  : disabled
                    ? 'cursor-not-allowed border-neutral-200 text-neutral-400 dark:border-neutral-800'
                    : 'border-neutral-300 hover:border-teal-500 dark:border-neutral-700'
              }`}
            >
              {prefecture}
            </button>
          )
        })}
      </div>
      {atMax && (
        <p className="mt-2 text-xs text-neutral-500">
          訪問都道府県は最大{maxCount}件まで選択できます。
        </p>
      )}
    </div>
  )
}
