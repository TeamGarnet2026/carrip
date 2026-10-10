'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type ReactNode } from 'react'
import { BudgetInput } from '@/components/form/budget-input'
import { DateRangePicker } from '@/components/form/date-range-picker'
import { DestinationPicker } from '@/components/form/destination-picker'
import { PreferenceSelector } from '@/components/form/preference-selector'
import { VehicleSelector } from '@/components/form/vehicle-selector'
import { Stepper } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { CheckIcon, LocateIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { formatJapaneseDate, formatTripLength } from '@/lib/format'
import {
  PLAN_STEPS,
  PREFERENCE_OPTIONS,
  VEHICLE_PRESETS,
} from '@/lib/plan/constants'
import { createPlanId, savePlanSession } from '@/lib/plan/storage'
import { defaultTripFormValues, type TripFormValues } from '@/lib/plan/types'

type PlanWizardProps = {
  initialStep: number
  /** トップのクイック入力などから引き継いだ値 */
  initialValues?: Partial<
    Pick<TripFormValues, 'origin' | 'departureDate' | 'days' | 'people' | 'prefecture'>
  > & { vehicleType?: string }
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
    if (form.vehicle.type === 'custom') {
      if (
        !form.vehicle.fuel_km_l ||
        form.vehicle.fuel_km_l < 1 ||
        form.vehicle.fuel_km_l > 200
      ) {
        errors.fuel = '燃費は1〜200 km/L の範囲で入力してください'
      } else if (!form.vehicle.fuel_type) {
        errors.fuel = '燃料種別を選択してください'
      }
    }
  }

  if (step === 3) {
    const maxDriveMin = form.options.maxDriveMin
    // 入力欄を空にしている間は NaN になるため、未入力も範囲外として扱う
    if (
      maxDriveMin !== 0 &&
      (!Number.isFinite(maxDriveMin) || maxDriveMin < 30 || maxDriveMin > 240)
    ) {
      errors.maxDriveMin =
        '連続運転上限は30〜240分、または交代なしを選んでください'
    }
  }

  return errors
}

function vehicleLabel(type: string): string {
  return VEHICLE_PRESETS.find((item) => item.id === type)?.label ?? type
}

function fuelLabel(fuelType: string | undefined): string {
  if (fuelType === 'premium') return 'ハイオク'
  if (fuelType === 'diesel') return '軽油'
  return 'レギュラー'
}

function buildInitialForm(initialValues: PlanWizardProps['initialValues']): TripFormValues {
  const form = defaultTripFormValues()
  if (!initialValues) return form
  const preset = VEHICLE_PRESETS.find((item) => item.id === initialValues.vehicleType)
  return {
    ...form,
    origin: initialValues.origin ?? form.origin,
    departureDate: initialValues.departureDate ?? form.departureDate,
    days: initialValues.days ?? form.days,
    people: initialValues.people ?? form.people,
    prefecture: initialValues.prefecture ?? form.prefecture,
    vehicle:
      preset && preset.id !== 'custom'
        ? { type: preset.id, fuel_km_l: preset.fuelKmL }
        : form.vehicle,
  }
}

const STEP_HEADINGS: Record<number, { title: string; lead?: string }> = {
  1: { title: 'どこから、いつ出発しますか？' },
  2: { title: 'どこへ、何人で行きますか？' },
  3: { title: 'こだわりの条件', lead: 'すべて任意です。あとから変えることもできます。' },
  4: { title: 'この条件で行き先を選びます' },
}

export function PlanWizard({ initialStep, initialValues }: PlanWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(initialStep)
  const [form, setForm] = useState<TripFormValues>(() => buildInitialForm(initialValues))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const stepErrors = useMemo(() => validateStep(step, form), [step, form])

  function updateForm(patch: Partial<TripFormValues>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function updateOptions(patch: Partial<TripFormValues['options']>) {
    setForm((current) => ({ ...current, options: { ...current.options, ...patch } }))
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
    router.push(`/plan/${planId}/spots`)
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

  const heading = STEP_HEADINGS[step]

  return (
    <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-16">
      <nav aria-label="入力ステップ" className="hidden md:block">
        <p className="mt-0 mb-4 text-sm text-muted">新しい旅程</p>
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {PLAN_STEPS.map((item) => {
            const current = item.step === step
            const done = item.step < step
            return (
              <li key={item.step}>
                <button
                  type="button"
                  aria-current={current ? 'step' : undefined}
                  disabled={!done}
                  onClick={() => {
                    setErrors({})
                    setStep(item.step)
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] transition ${
                    current
                      ? 'border border-line bg-surface font-semibold text-ink'
                      : done
                        ? 'text-ink-soft hover:bg-sunken'
                        : 'text-muted'
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] ${
                      current
                        ? 'bg-brand font-semibold text-white'
                        : done
                          ? 'bg-sunken text-brand'
                          : 'border border-line-strong'
                    }`}
                  >
                    {done ? <CheckIcon className="h-3.5 w-3.5" /> : item.step}
                  </span>
                  {item.label.replace('目的地・人数', '目的地・人数・車種')}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-col gap-8 px-5 py-7 md:px-12 md:py-10">
          <div>
            <h2 className="m-0 text-2xl font-bold md:text-[30px]">{heading.title}</h2>
            {heading.lead && <p className="mt-3 mb-0 text-[15px] text-muted">{heading.lead}</p>}
          </div>

          {step === 1 && (
            <>
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex-1">
                    <Input
                      label="出発地"
                      placeholder="京都駅"
                      value={form.origin}
                      errorMessage={errors.origin}
                      helperText="候補から選ぶか、地名をそのまま入力してください"
                      onChange={(origin) => updateForm({ origin })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGps}
                    className="flex min-h-[52px] items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-surface px-5 text-[15px] whitespace-nowrap text-ink transition hover:bg-soft sm:mt-[30px]"
                  >
                    <LocateIcon className="h-4 w-4" />
                    現在地を使う
                  </button>
                </div>
              </div>
              <DateRangePicker
                departureDate={form.departureDate}
                departureTime={form.options.departureTime}
                days={form.days}
                onChangeDate={(departureDate) => updateForm({ departureDate })}
                onChangeTime={(departureTime) => updateOptions({ departureTime })}
                onChangeDays={(days) => updateForm({ days })}
              />
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <DestinationPicker
                  value={form.prefecture}
                  onChange={(prefecture) => updateForm({ prefecture })}
                />
                {errors.prefecture && (
                  <p className="mt-2 mb-0 text-[13px] font-medium text-cost-admission" role="alert">
                    {errors.prefecture}
                  </p>
                )}
              </div>
              <div className="border-y border-line py-6">
                <Stepper
                  label="人数"
                  helperText="1〜15名。費用を1人あたりで割ります"
                  unit="人"
                  value={form.people}
                  min={1}
                  max={15}
                  onChange={(people) => updateForm({ people })}
                />
              </div>
              <div>
                <VehicleSelector
                  value={form.vehicle}
                  onChange={(vehicle) => updateForm({ vehicle })}
                />
                {errors.fuel && (
                  <p className="mt-2 mb-0 text-[13px] font-medium text-cost-admission" role="alert">
                    {errors.fuel}
                  </p>
                )}
              </div>
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
              <div>
                <p className="mt-0 mb-1 text-sm font-semibold">道路と往復</p>
                <label className="carrip-toggle-row">
                  高速道路を使う
                  <input
                    type="checkbox"
                    checked={form.options.useHighway}
                    onChange={(e) => updateOptions({ useHighway: e.target.checked })}
                  />
                </label>
                <label className="carrip-toggle-row">
                  ETCカードあり
                  <input
                    type="checkbox"
                    checked={form.options.etcCard}
                    onChange={(e) => updateOptions({ etcCard: e.target.checked })}
                  />
                </label>
                <label className="carrip-toggle-row border-b-0">
                  出発地に戻る（往復）
                  <input
                    type="checkbox"
                    checked={form.options.roundTrip}
                    onChange={(e) => updateOptions({ roundTrip: e.target.checked })}
                  />
                </label>
                <p className="mt-3 mb-0 text-[13px] text-muted">
                  比較用に、一般道だけのルートも一緒に計算します。
                </p>
              </div>
              <div>
                <p className="mt-0 mb-3 text-sm font-semibold">連続運転の上限</p>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="w-[170px]">
                    <Input
                      type="number"
                      min="30"
                      max="240"
                      suffix="分"
                      value={
                        form.options.maxDriveMin === 0 ||
                        !Number.isFinite(form.options.maxDriveMin)
                          ? ''
                          : String(form.options.maxDriveMin)
                      }
                      isDisabled={form.options.maxDriveMin === 0}
                      placeholder={form.options.maxDriveMin === 0 ? '交代なし' : undefined}
                      onChange={(raw) => {
                        // 空欄にして打ち直せるよう、未入力は NaN として保持する。
                        // 0 は「交代なし」を表すため、手入力の 0 も未入力扱いにする
                        const parsed = Number.parseInt(raw, 10)
                        updateOptions({
                          maxDriveMin:
                            Number.isFinite(parsed) && parsed !== 0 ? parsed : Number.NaN,
                        })
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    aria-pressed={form.options.maxDriveMin === 0}
                    onClick={() =>
                      updateOptions({
                        maxDriveMin: form.options.maxDriveMin === 0 ? 120 : 0,
                      })
                    }
                    className="carrip-option min-h-[52px]"
                  >
                    交代なし
                  </button>
                </div>
                {errors.maxDriveMin ? (
                  <p className="mt-2 mb-0 text-[13px] font-medium text-cost-admission" role="alert">
                    {errors.maxDriveMin}
                  </p>
                ) : (
                  <p className="mt-2 mb-0 text-[13px] text-muted">
                    {form.options.maxDriveMin === 0
                      ? '運転交代地点は提案しません。'
                      : '30〜240分。上限の前に交代できる場所（高速はSA・PA、一般道はコンビニ）を提案します'}
                  </p>
                )}
              </div>
            </>
          )}

          {step === 4 && (
            <dl className="m-0 border-t border-line">
              <SummaryRow
                label="出発地・日程"
                value={`${form.origin} · ${formatJapaneseDate(form.departureDate)}${form.options.departureTime.replace(/^0/, '')}`}
                detail={formatTripLength(form.days)}
                onChange={() => setStep(1)}
              />
              <SummaryRow
                label="目的地・人数"
                value={`${form.prefecture.join('、')} · ${form.people}人`}
                detail={`${vehicleLabel(form.vehicle.type)}${
                  form.vehicle.fuel_km_l ? `（${form.vehicle.fuel_km_l} km/L）` : ''
                }${form.vehicle.type === 'ev' ? '' : ` · ${fuelLabel(form.vehicle.fuel_type)}`}`}
                onChange={() => setStep(2)}
              />
              <SummaryRow
                label="予算・重視"
                value={
                  form.budgetPerPerson == null
                    ? '予算の上限なし'
                    : `${form.budgetMode === 'per_person' ? '1人あたり' : '総額'} ¥${form.budgetPerPerson.toLocaleString('ja-JP')}`
                }
                detail={
                  form.preferences.length > 0
                    ? form.preferences
                        .map(
                          (id) => PREFERENCE_OPTIONS.find((option) => option.id === id)?.label ?? id
                        )
                        .join('、')
                    : '重視することの指定なし'
                }
                onChange={() => setStep(3)}
              />
              <SummaryRow
                label="ルート"
                value={`高速${form.options.useHighway ? 'あり' : 'なし'} · ETC${
                  form.options.etcCard ? 'あり' : 'なし'
                } · ${form.options.roundTrip ? '往復' : '片道'}`}
                detail={
                  form.options.maxDriveMin === 0
                    ? '運転交代なし'
                    : `連続運転は${form.options.maxDriveMin}分まで（超える前に交代地点を提案）`
                }
                onChange={() => setStep(3)}
              />
            </dl>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-5 py-5 md:px-12">
          {step > 1 ? (
            <Button variant="secondary" onClick={handleBack}>
              戻る
            </Button>
          ) : (
            <Link href="/" className="px-2 text-[15px] text-ink no-underline">
              キャンセル
            </Link>
          )}
          {step < 4 ? (
            <Button onClick={handleNext} disabled={Object.keys(stepErrors).length > 0}>
              {step === 3 ? '確認へ' : '次へ'}
            </Button>
          ) : (
            <Button onClick={handleSubmit}>行き先を選ぶ</Button>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  detail,
  onChange,
}: {
  label: string
  value: ReactNode
  detail: ReactNode
  onChange: () => void
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-b border-line py-6 md:grid-cols-[180px_1fr_auto]">
      <dt className="text-sm text-muted md:row-span-2">{label}</dt>
      <dd className="col-start-1 m-0 text-base font-semibold md:col-start-2">{value}</dd>
      <dd className="col-start-1 m-0 text-sm text-muted md:col-start-2">{detail}</dd>
      <dd className="col-start-2 row-span-2 row-start-1 m-0 md:col-start-3">
        <button
          type="button"
          onClick={onChange}
          className="text-sm font-medium text-brand underline underline-offset-4"
        >
          変更
        </button>
      </dd>
    </div>
  )
}
