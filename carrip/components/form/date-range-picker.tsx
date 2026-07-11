'use client'

type DateRangePickerProps = {
  departureDate: string
  days: number
  onChangeDate: (date: string) => void
  onChangeDays: (days: number) => void
}

function minDateIso(): string {
  const today = new Date()
  return today.toISOString().slice(0, 10)
}

function maxDateIso(): string {
  const max = new Date()
  max.setDate(max.getDate() + 180)
  return max.toISOString().slice(0, 10)
}

export function DateRangePicker({
  departureDate,
  days,
  onChangeDate,
  onChangeDays,
}: DateRangePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium">出発日</label>
        <input
          type="date"
          min={minDateIso()}
          max={maxDateIso()}
          value={departureDate}
          onChange={(e) => onChangeDate(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-500">今日から180日以内</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">旅行日数</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={days <= 1}
            onClick={() => onChangeDays(Math.max(1, days - 1))}
            className="rounded border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-neutral-700"
          >
            −
          </button>
          <span className="min-w-12 text-center text-lg font-semibold">
            {days}日
          </span>
          <button
            type="button"
            disabled={days >= 7}
            onClick={() => onChangeDays(Math.min(7, days + 1))}
            className="rounded border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-neutral-700"
          >
            ＋
          </button>
        </div>
      </div>
    </div>
  )
}
