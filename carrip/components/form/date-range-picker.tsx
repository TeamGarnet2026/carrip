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
        <label className="mb-2 block text-[13px] font-bold text-ink">出発日</label>
        <input
          type="date"
          min={minDateIso()}
          max={maxDateIso()}
          value={departureDate}
          onChange={(e) => onChangeDate(e.target.value)}
          className="carrip-field min-h-[48px] w-full rounded-xl border border-line px-4 py-2.5 text-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-neutral-300 focus:border-brand focus:ring-4 focus:ring-brand/15"
          style={{
            colorScheme: 'light',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            WebkitTextFillColor: '#0f172a',
          }}
        />
        <p className="mt-1.5 text-xs text-muted">今日から180日以内</p>
      </div>
      <div>
        <label className="mb-2 block text-[13px] font-bold text-ink">旅行日数</label>
        <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            disabled={days <= 1}
            onClick={() => onChangeDays(Math.max(1, days - 1))}
            className="grid h-9 w-10 place-items-center rounded-lg text-base font-bold text-ink transition hover:bg-neutral-100 disabled:opacity-35 disabled:hover:bg-transparent"
          >
            −
          </button>
          <span className="min-w-14 text-center text-lg font-bold tabular-nums">
            {days}日
          </span>
          <button
            type="button"
            disabled={days >= 7}
            onClick={() => onChangeDays(Math.min(7, days + 1))}
            className="grid h-9 w-10 place-items-center rounded-lg text-base font-bold text-ink transition hover:bg-neutral-100 disabled:opacity-35 disabled:hover:bg-transparent"
          >
            ＋
          </button>
        </div>
      </div>
    </div>
  )
}
