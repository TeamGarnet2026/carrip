import { z } from 'zod'
import type { RouteCandidate } from '@/lib/routes/types'
import { FUEL_TYPES } from '@/lib/routes/fuel'
import { vehicleSchema } from '@/lib/routes/schema'

const routeStopSchema = z.object({
  place_id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  category: z.string().optional(),
  is_rest_stop: z.boolean().optional(),
  stay_minutes: z.number().int().min(0).max(720).optional(),
  parking_yen: z.number().int().min(0).max(100000).optional(),
  parking_source: z.string().optional(),
  admission_yen_per_person: z.number().int().min(0).max(100000).optional(),
})

const costBreakdownSchema = z.object({
  fuel: z.number(),
  toll: z.number(),
  parking: z.number(),
  admission: z.number(),
})

const routeCandidateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  transport_mode: z.literal('car'),
  stops: z.array(routeStopSchema).min(1),
  polyline: z.array(z.object({ lat: z.number(), lng: z.number() })),
  sections: z.array(
    z.object({
      type: z.string(),
      name: z.string(),
      distance_km: z.number().optional(),
      duration_min: z.number().optional(),
    })
  ),
  cost_breakdown: costBreakdownSchema,
  total_distance_km: z.number(),
  total_duration_min: z.number(),
  total_cost: z.number(),
  cost_per_person: z.number(),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
})

export const createTripSchema = z.object({
  origin: z.string().min(1),
  prefecture: z.array(z.string()).min(1).max(5),
  departure_date: z.string().min(1),
  days: z.number().int().min(1).max(7),
  people: z.number().int().min(1).max(15),
  vehicle: vehicleSchema,
  route: routeCandidateSchema,
  round_trip: z.boolean().optional(),
})

export type CreateTripInput = z.infer<typeof createTripSchema>
export type SavedRouteCandidate = RouteCandidate

export const poiSearchQuerySchema = z.object({
  q: z.string().min(1),
  category: z.enum(['all', 'tourist', 'rest_area', 'service_area']).default('all'),
  prefecture: z.string().optional(),
})

export type PoiSearchQuery = z.infer<typeof poiSearchQuerySchema>
