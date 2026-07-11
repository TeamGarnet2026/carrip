export type ParkingSource =
  | 'places'
  | 'category_default'
  | 'free'
  | 'manual'
  | 'estimate'

export type RouteStop = {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  category?: string
  is_rest_stop?: boolean
  stay_minutes?: number
  parking_yen?: number
  parking_source?: ParkingSource
  admission_yen_per_person?: number
}

export type CostBreakdown = {
  fuel: number
  toll: number
  parking: number
  admission: number
}

export type CostSources = {
  fuel?: 'government_api' | 'monthly_fallback' | 'fixed_fallback'
  toll?: 'navitime' | 'estimate'
  parking?: ParkingSource
  admission?: 'places' | 'estimate'
}

export type RouteSection = {
  type: string
  name: string
  distance_km?: number
  duration_min?: number
}

export type RouteCandidate = {
  id: string
  title: string
  summary: string
  transport_mode: 'car'
  stops: RouteStop[]
  polyline: Array<{ lat: number; lng: number }>
  sections: RouteSection[]
  cost_breakdown: CostBreakdown
  cost_sources?: CostSources
  total_distance_km: number
  total_duration_min: number
  total_cost: number
  cost_per_person: number
  departure_time?: string
  arrival_time?: string
  round_trip?: boolean
}

export type RouteGenerateRequest = {
  origin: string
  prefecture: string[]
  departure_date: string
  days: number
  people: number
  vehicle: {
    type: string
    fuel_km_l?: number
    fuel_type?: 'diesel' | 'regular' | 'premium'
  }
  budget_per_person?: number
  preferences?: string[]
  options?: {
    use_highway?: boolean
    departure_time?: string
    max_drive_min?: number
    etc_card?: boolean
    round_trip?: boolean
  }
}

import type { DegradedReason } from '@/lib/routes/degraded'

export type RouteSearchResult = {
  routes: RouteCandidate[]
  generated_at: string
  degraded?: boolean
  degraded_reasons?: DegradedReason[]
  gemini_used?: boolean
}

export type RouteSearchResponse = RouteSearchResult & {
  cached: boolean
  cache_backend?: 'redis' | 'memory'
  cache_key: string
  cache_ttl_seconds: number
  mode?: 'stub' | 'live'
}
