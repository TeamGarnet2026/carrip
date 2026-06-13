import type { RouteGenerateRequest } from '@/lib/routes/types'
import { calculateTotalAdmissionCost } from '@/lib/google/admission-fee'
import { getFuelPriceYen } from '@/lib/routes/fuel'

export type CostBreakdown = {
  fuel: number
  toll: number
  parking: number
  admission: number
}

const DEFAULT_FUEL_KM_L: Record<string, number> = {
  compact: 18,
  kei: 23,
  sedan: 15,
  suv: 12,
  minivan: 11,
  custom: 15,
}

function getFuelEfficiency(request: RouteGenerateRequest): number {
  if (request.vehicle.fuel_km_l) return request.vehicle.fuel_km_l
  return DEFAULT_FUEL_KM_L[request.vehicle.type] ?? 15
}

export function buildCostBreakdown(
  request: RouteGenerateRequest,
  distanceKm: number,
  tollYen: number,
  admissionFeesPerPerson: number[] = [],
  parkingYen = 0,
  fuelPriceYen?: number
): CostBreakdown {
  const fuelKmL = getFuelEfficiency(request)
  const unitPrice = fuelPriceYen ?? getFuelPriceYen(request.vehicle)
  const fuel = Math.round((distanceKm / fuelKmL) * unitPrice)
  const admission = calculateTotalAdmissionCost(
    admissionFeesPerPerson,
    request.people
  )

  return {
    fuel,
    toll: tollYen,
    parking: parkingYen,
    admission,
  }
}

export function sumCostBreakdown(breakdown: CostBreakdown): number {
  return breakdown.fuel + breakdown.toll + breakdown.parking + breakdown.admission
}
