export const FUEL_TYPES = ['diesel', 'regular', 'premium'] as const

export type FuelType = (typeof FUEL_TYPES)[number]

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  diesel: '軽油',
  regular: 'ガソリン',
  premium: 'ハイオク',
}

export const FUEL_PRICE_YEN: Record<FuelType, number> = {
  diesel: 140,
  regular: 170,
  premium: 190,
}

export const VEHICLE_PRESET_TYPES = [
  'compact',
  'kei',
  'sedan',
  'suv',
  'minivan',
] as const

export type VehiclePresetType = (typeof VEHICLE_PRESET_TYPES)[number]

/** 車種プリセットごとのデフォルト燃料（カスタム以外はアプリ側で決定） */
export const DEFAULT_FUEL_TYPE_BY_VEHICLE: Record<VehiclePresetType, FuelType> = {
  kei: 'regular',
  compact: 'regular',
  sedan: 'regular',
  suv: 'regular',
  minivan: 'regular',
}

export type VehicleFuelInput = {
  type: string
  fuel_type?: FuelType | null
}

export function resolveFuelType(vehicle: VehicleFuelInput): FuelType {
  if (vehicle.fuel_type) {
    return vehicle.fuel_type
  }

  if (vehicle.type in DEFAULT_FUEL_TYPE_BY_VEHICLE) {
    return DEFAULT_FUEL_TYPE_BY_VEHICLE[
      vehicle.type as VehiclePresetType
    ]
  }

  return 'regular'
}

export function getFuelPriceYen(vehicle: VehicleFuelInput): number {
  return FUEL_PRICE_YEN[resolveFuelType(vehicle)]
}
