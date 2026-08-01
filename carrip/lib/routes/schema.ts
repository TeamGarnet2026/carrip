import { z } from 'zod'
import { FUEL_TYPES } from '@/lib/routes/fuel'

const fuelTypeSchema = z.enum(FUEL_TYPES)

export const vehicleSchema = z
  .object({
    type: z.string().min(1),
    fuel_km_l: z.number().min(1).max(200).optional(),
    fuel_type: fuelTypeSchema.optional(),
  })
  .superRefine((vehicle, ctx) => {
    if (vehicle.type === 'custom' && !vehicle.fuel_type) {
      ctx.addIssue({
        code: 'custom',
        message: 'カスタム車種では fuel_type（diesel / regular / premium）が必須です',
        path: ['fuel_type'],
      })
    }
  })

export const routeGenerateSchema = z.object({
  origin: z.string().min(1),
  prefecture: z.array(z.string()).min(1).max(5),
  departure_date: z.string().min(1),
  days: z.number().int().min(1).max(7),
  people: z.number().int().min(1).max(15),
  vehicle: vehicleSchema,
  budget_per_person: z.number().int().positive().optional(),
  preferences: z.array(z.string()).optional(),
  options: z
    .object({
      use_highway: z.boolean().optional(),
      departure_time: z.string().optional(),
      max_drive_min: z
        .number()
        .int()
        .refine((value) => value === 0 || (value >= 30 && value <= 240), {
          message: 'max_drive_min は 0（交代なし）または 30〜240 です',
        })
        .optional(),
      etc_card: z.boolean().optional(),
      round_trip: z.boolean().optional(),
    })
    .optional(),
})

export const routeStopEditSchema = z.object({
  place_id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  category: z.string().optional(),
  is_rest_stop: z.boolean().optional(),
  stay_minutes: z.number().int().min(0).max(720).optional(),
  parking_yen: z.number().int().min(0).max(100000).optional(),
  parking_source: z
    .enum(['places', 'category_default', 'free', 'manual', 'estimate'])
    .optional(),
  admission_yen_per_person: z.number().int().min(0).max(100000).optional(),
})

export const routeRecalculateSchema = z.object({
  request: routeGenerateSchema,
  route_id: z.string().min(1),
  stops: z.array(routeStopEditSchema).min(1).max(15),
})

export type RouteRecalculateInput = z.infer<typeof routeRecalculateSchema>
