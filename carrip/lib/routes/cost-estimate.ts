import type { RouteGenerateRequest } from '@/lib/routes/types'
import { calculateTotalAdmissionCost } from '@/lib/google/admission-fee'

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

const GAS_PRICE_YEN = 170
const PARKING_YEN_PER_STOP = 500

function getFuelEfficiency(request: RouteGenerateRequest): number {
  if (request.vehicle.fuel_km_l) return request.vehicle.fuel_km_l
  return DEFAULT_FUEL_KM_L[request.vehicle.type] ?? 15
}

export function buildCostBreakdown(
  request: RouteGenerateRequest,
  distanceKm: number,
  stopCount: number,
  tollYen: number,
  admissionFeesPerPerson: number[] = []
): CostBreakdown {
  const fuelKmL = getFuelEfficiency(request)
  const fuel = Math.round((distanceKm / fuelKmL) * GAS_PRICE_YEN)
  const parking = stopCount * PARKING_YEN_PER_STOP
  const admission = calculateTotalAdmissionCost(
    admissionFeesPerPerson,
    request.people
  )

  return {
    fuel,
    toll: tollYen,
    parking,
    admission,
  }
}

export function sumCostBreakdown(breakdown: CostBreakdown): number {
  return breakdown.fuel + breakdown.toll + breakdown.parking + breakdown.admission
}
