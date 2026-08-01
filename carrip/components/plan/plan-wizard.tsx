'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { BudgetInput } from '@/components/form/budget-input'
import { DateRangePicker } from '@/components/form/date-range-picker'
import { DestinationPicker } from '@/components/form/destination-picker'
import { PreferenceSelector } from '@/components/form/preference-selector'
import { VehicleSelector } from '@/components/form/vehicle-selector'
import { Stepper } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PLAN_STEPS, VEHICLE_PRESETS } from '@/lib/plan/constants'
import {
  createPlanId,
  savePlanSession,
} from '@/lib/plan/storage'
import {
  defaultTripFormValues,
  type TripFormValues,
} from '@/lib/plan/types'

type PlanWizardProps = {
  initialStep: number
}

function validateStep(step: number, form: TripFormValues): Record<string, string> {
  const errors: Record<string, string> = {}

  if (step === 1) {
    if (!form.origin.trim()) {
      errors.origin = '出発地を入力してください'
    }
    if (!form.departureDate) {
      errors.departureDate = '出発日を選択してください'
    }
  }

  if (step === 2) {
    if (form.prefecture.length === 0) {
      errors.prefecture = '訪問都道府県を1つ以上選択してください'
    }
    if (form.people < 1 || form.people > 15) {
      errors.people = '人数は1〜15名で設定してください'
    }
  }

  if (step === 3) {
    if (form.vehicle.type === 'custom') {
      if (!form.vehicle.fuel_km_l || form.vehicle.fuel_km_l < 1 || form.vehicle.fuel_km_l > 200) {
        errors.fuel = '燃費は1〜200 km/L の範囲で入力してください'
      }
    }
    if (
      form.options.maxDriveMin !== 0 &&
      (form.options.maxDriveMin < 30 || form.options.maxDriveMin > 240)
    ) {
      errors.maxDriveMin = '連続運転上限は30〜240分、または交代なしを選んでください'
  if (step === 2 && form.vehicle.type === 'custom') {
    if (!form.vehicle.fuel_km_l || form.vehicle.fuel_km_l < 1 || form.vehicle.fuel_km_l > 200) {
      errors.fuel = '燃費は1〜200 km/L の範囲で入力してください'
    } else if (!form.vehicle.fuel_type) {
      errors.fuel = '燃料種別を選択してください'
    }
  }

  return errors
}

function vehicleLabel(type: string): string {
  return VEHICLE_PRESETS.find((item) => item.id === type)?.label ?? type
}

export function PlanWizard({ initialStep }: PlanWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(initialStep)
  const [form, setForm] = useState<TripFormValues>(defaultTripFormValues())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const stepErrors = useMemo(() => validateStep(step, form), [step, form])

  function updateForm(patch: Partial<TripFormValues>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function handleNext() {
    const nextErrors = validateStep(step, form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setStep((current) => Math.min(4, current + 1))
  }

  function handleBack() {
    setErrors({})
    setStep((current) => Math.max(1, current - 1))
  }

  function handleSubmit() {
    for (let current = 1; current <= 3; current += 1) {
      const validation = validateStep(current, form)
      if (Object.keys(validation).length > 0) {
        setStep(current)
        setErrors(validation)
        return
      }
    }

    const planId = createPlanId()
    savePlanSession({ id: planId, form })
    router.push(`/plan/generating?id=${planId}`)
  }

  function handleGps() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      () => {
        updateForm({ origin: '現在地（GPS）' })
      },
      () => {
        setErrors({ origin: '位置情報の取得に失敗しました' })
      }
    )
  }

  return (
    <div className="carrip-wizard-card">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5ecef]">
          <span
            className="block h-full rounded-full bg-brand transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
        <span className="text-[13px] font-extrabold whitespace-nowrap text-muted">
          ステップ {step} / 4
        </span>
      </div>

      <ol className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
        {PLAN_STEPS.map((item) => (
          <li
            key={item.step}
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
              item.step === step
                ? 'bg-brand text-white'
                : item.step < step
                  ? 'bg-[#e8f4f2] text-brand-dark'
                  : 'bg-soft text-muted'
            }`}
          >
            {item.step}. {item.label}
          </li>
        ))}
      </ol>

      <div className="space-y-6 p-6">
        {step === 1 && (
          <>
            <Input
              label="出発地"
              placeholder="例: 京都駅"
              value={form.origin}
              errorMessage={errors.origin}
              helperText="住所候補から選択するか、地名を入力してください"
              onChange={(origin) => updateForm({ origin })}
            />
            <Button variant="secondary" size="sm" onClick={handleGps}>
              現在地を取得（GPS）
            </Button>
            <DateRangePicker
              departureDate={form.departureDate}
              days={form.days}
              onChangeDate={(departureDate) => updateForm({ departureDate })}
              onChangeDays={(days) => updateForm({ days })}
            />
          </>
        )}

        {step === 2 && (
          <>
            <DestinationPicker
              value={form.prefecture}
              onChange={(prefecture) => updateForm({ prefecture })}
            />
            {errors.prefecture && (
              <p className="text-sm text-red-600" role="alert">
                {errors.prefecture}
              </p>
            )}
            <Stepper
              label="人数"
              value={form.people}
              min={1}
              max={15}
              onChange={(people) => updateForm({ people })}
            />
            <VehicleSelector
              value={form.vehicle}
              onChange={(vehicle) => updateForm({ vehicle })}
            />
            {errors.fuel && (
              <p className="text-sm text-red-600" role="alert">
                {errors.fuel}
              </p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <BudgetInput
              value={form.budgetPerPerson}
              mode={form.budgetMode}
              people={form.people}
              onChange={(budgetPerPerson) => updateForm({ budgetPerPerson })}
              onChangeMode={(budgetMode) => updateForm({ budgetMode })}
            />
            <PreferenceSelector
              value={form.preferences}
              onChange={(preferences) => updateForm({ preferences })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                ETCカードあり
                <input
                  type="checkbox"
                  checked={form.options.etcCard}
                  onChange={(e) =>
                    updateForm({
                      options: { ...form.options, etcCard: e.target.checked },
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                出発地に戻る（往復）
                <input
                  type="checkbox"
                  checked={form.options.roundTrip}
                  onChange={(e) =>
                    updateForm({
                      options: {
                        ...form.options,
                        roundTrip: e.target.checked,
                      },
                    })
                  }
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="希望出発時刻"
                type="time"
                value={form.options.departureTime}
                onChange={(departureTime) =>
                  updateForm({
                    options: { ...form.options, departureTime },
                  })
                }
              />
              <div className="space-y-2">
                <Input
                  label="連続運転上限（分）"
                  type="number"
                  min="30"
                  max="240"
                  value={
                    form.options.maxDriveMin === 0
                      ? ''
                      : String(form.options.maxDriveMin)
                  }
                  isDisabled={form.options.maxDriveMin === 0}
                  placeholder={
                    form.options.maxDriveMin === 0 ? '交代なし' : undefined
                  }
                  helperText="30〜240分で入力"
                  errorMessage={errors.maxDriveMin}
                  onChange={(raw) => {
                    const parsed = Number.parseInt(raw, 10)
                    if (!Number.isFinite(parsed)) return
                    updateForm({
                      options: { ...form.options, maxDriveMin: parsed },
                    })
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const noChange = form.options.maxDriveMin === 0
                    updateForm({
                      options: {
                        ...form.options,
                        maxDriveMin: noChange ? 120 : 0,
                      },
                    })
                  }}
                  className={`w-full rounded-[7px] border px-3 py-2 text-sm font-medium transition ${
                    form.options.maxDriveMin === 0
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-line bg-[#fbfcfd] text-ink hover:border-brand/40'
                  }`}
                >
                  {form.options.maxDriveMin === 0
                    ? '交代なし（選択中）'
                    : '交代なし'}
                </button>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              {form.options.maxDriveMin === 0
                ? '運転交代地点は提案しません。'
                : '上限を超える前に運転交代地点を提案します（高速利用時は SA/PA、一般道はコンビニ）。'}
              上限を超える前に運転交代地点を提案します（コスト重視は一般道・コンビニ、他ルートは高速・SA/PA）。
            </p>
          </>
        )}

        {step === 4 && (
          <div className="space-y-4 text-sm">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">出発地・日程</h2>
                <button
                  type="button"
                  className="text-teal-700 underline dark:text-teal-400"
                  onClick={() => setStep(1)}
                >
                  変更
                </button>
              </div>
              <p>{form.origin}</p>
              <p className="text-neutral-600 dark:text-neutral-400">
                {form.departureDate} 出発 · {form.days}日間
              </p>
            </section>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">目的地・人数・車種</h2>
                <button
                  type="button"
                  className="text-teal-700 underline dark:text-teal-400"
                  onClick={() => setStep(2)}
                >
                  変更
                </button>
              </div>
              <p>{form.prefecture.join('、')}</p>
              <p className="text-neutral-600 dark:text-neutral-400">
                {form.people}人 · {vehicleLabel(form.vehicle.type)}
              </p>
            </section>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">詳細設定</h2>
                <button
                  type="button"
                  className="text-teal-700 underline dark:text-teal-400"
                  onClick={() => setStep(3)}
                >
                  変更
                </button>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400">
                予算:{' '}
                {form.budgetPerPerson == null
                  ? '無制限'
                  : `${form.budgetPerPerson.toLocaleString('ja-JP')}円（${
                      form.budgetMode === 'per_person' ? '1人あたり' : '総額'
                    }）`}
              </p>
              <p className="text-neutral-600 dark:text-neutral-400">
                優先軸:{' '}
                {form.preferences.length > 0
                  ? form.preferences.join('、')
                  : 'なし'}
              </p>
              <p className="text-neutral-600 dark:text-neutral-400">
                ETC: {form.options.etcCard ? 'あり' : 'なし'} · 出発{' '}
                {form.options.departureTime} ·{' '}
                {form.options.roundTrip ? '往復（出発地に戻る）' : '片道'}
              </p>
              <p className="text-neutral-600 dark:text-neutral-400">
                連続運転上限:{' '}
                {form.options.maxDriveMin === 0
                  ? '交代なし'
                  : `${form.options.maxDriveMin}分（超過前に交代地点を提案）`}
              </p>
            </section>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-3 border-t border-line px-5 py-4">
        {step > 1 ? (
          <Button variant="secondary" onClick={handleBack}>
            戻る
          </Button>
        ) : (
          <Link href="/">
            <Button variant="secondary">キャンセル</Button>
          </Link>
        )}
        {step < 4 ? (
          <Button
            onClick={handleNext}
            disabled={Object.keys(stepErrors).length > 0}
          >
            次へ
          </Button>
        ) : (
          <Button onClick={handleSubmit}>ルートを生成する</Button>
        )}
      </div>
    </div>
  )
}
