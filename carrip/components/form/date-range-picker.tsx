'use client'

import { useId } from 'react'

type DateRangePickerProps = {
  departureDate: string
  departureTime: string
  days: number
  onChangeDate: (date: string) => void
  onChangeTime: (time: string) => void
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

const DAY_CHOICES = [
  { value: 1, label: '日帰り' },
  { value: 2, label: '1泊2日' },
  { value: 3, label: '2泊3日' },
] as const

const LONG_TRIP_DAYS = [4, 5, 6, 7]

const fieldClass =
  'carrip-field min-h-[52px] w-full rounded-[10px] border border-line-strong px-4 text-base outline-none focus:border-ink focus:ring-1 focus:ring-ink'

/** 出発日・出発時刻・旅行日数 */
export function DateRangePicker({
  departureDate,
  departureTime,
  days,
  onChangeDate,
  onChangeTime,
  onChangeDays,
}: DateRangePickerProps) {
  const dateId = useId()
  const timeId = useId()
  const daysId = useId()
  const isLongTrip = days >= 4

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={dateId} className="mb-2 block text-sm font-semibold">
            出発日
          </label>
          <input
            id={dateId}
            type="date"
            min={minDateIso()}
            max={maxDateIso()}
            value={departureDate}
            onChange={(e) => onChangeDate(e.target.value)}
            className={fieldClass}
          />
          <p className="mt-2 mb-0 text-[13px] text-muted">今日から180日以内</p>
        </div>
        <div>
          <label htmlFor={timeId} className="mb-2 block text-sm font-semibold">
            出発時刻
          </label>
          <input
            id={timeId}
            type="time"
            value={departureTime}
            onChange={(e) => onChangeTime(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <fieldset className="m-0 border-0 p-0">
        <legend id={daysId} className="mb-3 p-0 text-sm font-semibold">
          旅行日数
        </legend>
        <div className="flex flex-wrap gap-3">
          {DAY_CHOICES.map((choice) => (
            <label key={choice.value} className="carrip-option">
              <input
                type="radio"
                name="trip-days"
                checked={days === choice.value}
                onChange={() => onChangeDays(choice.value)}
              />
              {choice.label}
            </label>
          ))}
          <label className="carrip-option">
            <input
              type="radio"
              name="trip-days"
              checked={isLongTrip}
              onChange={() => onChangeDays(4)}
            />
            それ以上
          </label>
        </div>
        {isLongTrip && (
          <select
            aria-labelledby={daysId}
            value={days}
            onChange={(e) => onChangeDays(Number(e.target.value))}
            className={`${fieldClass} mt-3 max-w-[200px]`}
          >
            {LONG_TRIP_DAYS.map((value) => (
              <option key={value} value={value}>
                {value - 1}泊{value}日
              </option>
            ))}
          </select>
        )}
      </fieldset>
    </div>
  )
}
