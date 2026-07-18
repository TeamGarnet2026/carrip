import type { RouteGenerateRequest, RouteSearchResponse } from '@/lib/routes/types'

export type TripFormValues = {
  origin: string
  prefecture: string[]
  departureDate: string
  days: number
  people: number
  vehicle: {
    type: string
    fuel_km_l?: number
    fuel_type?: 'diesel' | 'regular' | 'premium'
  }
  budgetPerPerson: number | null
  budgetMode: 'per_person' | 'total'
  preferences: string[]
  options: {
    useHighway: boolean
    departureTime: string
    maxDriveMin: number
    etcCard: boolean
    parkingSize: 'standard' | 'large'
    roundTrip: boolean
  }
}

export type PlanSession = {
  id: string
  form: TripFormValues
  routes?: RouteSearchResponse
  selectedRouteId?: string
  savedTripId?: string
  savedRouteId?: string
}

export function defaultTripFormValues(): TripFormValues {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  return {
    origin: '',
    prefecture: [],
    departureDate: tomorrow.toISOString().slice(0, 10),
    days: 1,
    people: 2,
    vehicle: { type: 'compact' },
    budgetPerPerson: null,
    budgetMode: 'per_person',
    preferences: [],
    options: {
      useHighway: true,
      departureTime: '08:00',
      maxDriveMin: 120,
      etcCard: true,
      parkingSize: 'standard',
      roundTrip: true,
    },
  }
}

export function toRouteGenerateRequest(
  form: TripFormValues
): RouteGenerateRequest {
  const budgetPerPerson =
    form.budgetPerPerson == null
      ? undefined
      : form.budgetMode === 'per_person'
        ? form.budgetPerPerson
        : Math.ceil(form.budgetPerPerson / form.people)

  return {
    origin: form.origin,
    prefecture: form.prefecture,
    departure_date: form.departureDate,
    days: form.days,
    people: form.people,
    vehicle: form.vehicle,
    budget_per_person: budgetPerPerson,
    preferences: form.preferences.length > 0 ? form.preferences : undefined,
    options: {
      use_highway: form.options.useHighway,
      departure_time: form.options.departureTime,
      max_drive_min: form.options.maxDriveMin,
      etc_card: form.options.etcCard,
      round_trip: form.options.roundTrip,
    },
  }
}
