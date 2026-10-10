'use client'

import { Input } from '@/components/ui/input'
import { VEHICLE_PRESETS } from '@/lib/plan/constants'
import type { FuelType } from '@/lib/routes/fuel'

type VehicleValue = {
  type: string
  fuel_km_l?: number
  fuel_type?: FuelType
}

type VehicleSelectorProps = {
  value: VehicleValue
  onChange: (value: VehicleValue) => void
}

/** 画面での表示名（ガソリン → レギュラー） */
const FUEL_CHOICES: Array<{ id: FuelType; label: string }> = [
  { id: 'regular', label: 'レギュラー' },
  { id: 'premium', label: 'ハイオク' },
  { id: 'diesel', label: '軽油' },
]

function presetDescription(preset: (typeof VEHICLE_PRESETS)[number]): string {
  if (preset.id === 'custom') return '燃費を直接入力'
  const unit = preset.id === 'ev' ? 'km/kWh' : 'km/L'
  return `${preset.fuelKmL} ${unit} · ${preset.example.split('・')[0]}など`
}

function presetLabel(label: string): string {
  return label.replace('（電気自動車）', '').replace('カスタム入力', 'カスタム').replace('/', '・')
}

/** 車種（燃費つきのカード）と燃料の選択 */
export function VehicleSelector({ value, onChange }: VehicleSelectorProps) {
  const isCustom = value.type === 'custom'
  const isEv = value.type === 'ev'
  const selectedFuel = value.fuel_type ?? 'regular'

  return (
    <div className="flex flex-col gap-7">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 p-0 text-sm font-semibold">車種</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
          {VEHICLE_PRESETS.map((preset) => (
            <label
              key={preset.id}
              className="carrip-option flex-col items-start gap-1.5 py-4 whitespace-normal"
            >
              <span className="flex items-center gap-2.5 text-[15px] whitespace-nowrap">
                <input
                  type="radio"
                  name="vehicle-type"
                  checked={value.type === preset.id}
                  onChange={() =>
                    onChange({
                      ...value,
                      type: preset.id,
                      fuel_km_l: preset.id === 'custom' ? value.fuel_km_l : preset.fuelKmL,
                    })
                  }
                />
                {presetLabel(preset.label)}
              </span>
              <span className="pl-7 text-[13px] font-normal text-muted">
                {presetDescription(preset)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {isCustom && (
        <Input
          label="燃費（km/L または km/kWh）"
          type="number"
          min="1"
          max="200"
          suffix="km/L"
          value={value.fuel_km_l?.toString() ?? ''}
          onChange={(next) =>
            onChange({
              ...value,
              fuel_km_l: next ? Number(next) : undefined,
            })
          }
          helperText="1〜200 の範囲で入力してください"
        />
      )}

      {!isEv && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 p-0 text-sm font-semibold">燃料</legend>
          <div className="flex flex-wrap gap-3">
            {FUEL_CHOICES.map((fuel) => (
              <label key={fuel.id} className="carrip-option">
                <input
                  type="radio"
                  name="fuel-type"
                  checked={isCustom ? value.fuel_type === fuel.id : selectedFuel === fuel.id}
                  onChange={() => onChange({ ...value, fuel_type: fuel.id })}
                />
                {fuel.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}
