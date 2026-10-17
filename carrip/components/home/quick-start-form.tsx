'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'
import { ArrowRightIcon } from '@/components/ui/icons'
import { VEHICLE_PRESETS } from '@/lib/plan/constants'

function tomorrowIso(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

const DAY_OPTIONS = [
  { value: 1, label: '日帰り' },
  { value: 2, label: '1泊2日' },
  { value: 3, label: '2泊3日' },
  { value: 4, label: '3泊4日' },
]

const fieldLabel = 'block text-[12px] text-muted'
const fieldControl =
  'carrip-field mt-1 w-full border-0 bg-transparent p-0 text-base font-medium text-ink outline-none'

/** トップの「出発地・日程・人数・車種」入力。条件入力の画面に値を引き継いで進む */
export function QuickStartForm() {
  const router = useRouter()
  const ids = {
    origin: useId(),
    date: useId(),
    days: useId(),
    people: useId(),
    vehicle: useId(),
  }
  const [origin, setOrigin] = useState('')
  const [date, setDate] = useState(tomorrowIso)
  const [days, setDays] = useState(1)
  const [people, setPeople] = useState(4)
  const [vehicle, setVehicle] = useState('minivan')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams({
      step: origin.trim() ? '2' : '1',
      date,
      days: String(days),
      people: String(people),
      vehicle,
    })
    if (origin.trim()) params.set('origin', origin.trim())
    router.push(`/plan/new?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid overflow-hidden rounded-2xl border border-line bg-surface md:grid-cols-[1.6fr_1.2fr_0.8fr_0.8fr_1fr_auto] md:items-stretch"
    >
      <div className="border-b border-line px-5 py-3.5 md:border-r md:border-b-0">
        <label htmlFor={ids.origin} className={fieldLabel}>
          出発地
        </label>
        <input
          id={ids.origin}
          value={origin}
          onChange={(event) => setOrigin(event.target.value)}
          placeholder="京都駅"
          className={fieldControl}
          style={{ backgroundColor: 'transparent' }}
        />
      </div>
      <div className="grid grid-cols-2 md:contents">
        <div className="border-r border-b border-line px-5 py-3.5 md:border-b-0">
          <label htmlFor={ids.date} className={fieldLabel}>
            出発日
          </label>
          <input
            id={ids.date}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={fieldControl}
            style={{ backgroundColor: 'transparent' }}
          />
        </div>
        <div className="hidden border-r border-line px-5 py-3.5 md:block">
          <label htmlFor={ids.days} className={fieldLabel}>
            日数
          </label>
          <select
            id={ids.days}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className={fieldControl}
            style={{ backgroundColor: 'transparent' }}
          >
            {DAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="border-b border-line px-5 py-3.5 md:border-r md:border-b-0">
          <label htmlFor={ids.people} className={fieldLabel}>
            人数
          </label>
          <select
            id={ids.people}
            value={people}
            onChange={(event) => setPeople(Number(event.target.value))}
            className={fieldControl}
            style={{ backgroundColor: 'transparent' }}
          >
            {Array.from({ length: 15 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count}人
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="hidden border-r border-line px-5 py-3.5 md:block">
        <label htmlFor={ids.vehicle} className={fieldLabel}>
          車種
        </label>
        <select
          id={ids.vehicle}
          value={vehicle}
          onChange={(event) => setVehicle(event.target.value)}
          className={fieldControl}
          style={{ backgroundColor: 'transparent' }}
        >
          {VEHICLE_PRESETS.filter((preset) => preset.id !== 'custom').map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
      <div className="p-2">
        <button
          type="submit"
          className="flex h-full min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-brand px-6 text-[15px] font-semibold text-white transition hover:bg-brand-dark"
        >
          <span className="md:hidden">プランを作る</span>
          <span className="hidden md:inline">行き先を選ぶ</span>
          <ArrowRightIcon className="hidden h-4 w-4 md:block" />
        </button>
      </div>
    </form>
  )
}
