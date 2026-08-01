'use client'

import { VEHICLE_PRESETS } from '@/lib/plan/constants'
import { FUEL_TYPES, FUEL_TYPE_LABELS } from '@/lib/routes/fuel'
import { Input } from '@/components/ui/input'

type VehicleValue = {
  type: string
  fuel_km_l?: number
  fuel_type?: 'diesel' | 'regular' | 'premium'
}

type VehicleSelectorProps = {
  value: VehicleValue
  onChange: (value: VehicleValue) => void
}

export function VehicleSelector({ value, onChange }: VehicleSelectorProps) {
  const isCustom = value.type === 'custom'

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">車種</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {VEHICLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                onChange({
                  type: preset.id,
                  fuel_km_l:
                    preset.id === 'custom' ? value.fuel_km_l : preset.fuelKmL,
                })
              }
              className={`rounded-lg border p-3 text-left text-sm transition ${
                value.type === preset.id
                  ? 'border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950'
                  : 'border-neutral-200 hover:border-teal-400 dark:border-neutral-800'
              }`}
            >
              <p className="font-medium">{preset.label}</p>
              <p className="mt-1 text-xs text-neutral-500">{preset.example}</p>
            </button>
          ))}
        </div>
      </div>

      {isCustom && (
        <>
          <Input
            label="カスタム燃費（km/L または km/kWh）"
            type="number"
            min="1"
            max="200"
            value={value.fuel_km_l?.toString() ?? ''}
            onChange={(next) =>
              onChange({
                ...value,
                fuel_km_l: next ? Number(next) : undefined,
              })
            }
            helperText="1〜200 の範囲で入力してください"
          />
          <div>
            <p className="mb-2 text-sm font-medium">燃料種別</p>
            <div className="grid grid-cols-3 gap-2">
              {FUEL_TYPES.map((fuelType) => (
                <button
                  key={fuelType}
                  type="button"
                  onClick={() => onChange({ ...value, fuel_type: fuelType })}
                  className={`rounded-lg border p-2 text-sm transition ${
                    value.fuel_type === fuelType
                      ? 'border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950'
                      : 'border-neutral-200 hover:border-teal-400 dark:border-neutral-800'
                  }`}
                >
                  {FUEL_TYPE_LABELS[fuelType]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
