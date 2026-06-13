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
  days: z.number().int().min(1).max(3),
  people: z.number().int().min(1).max(10),
  vehicle: vehicleSchema,
  budget_per_person: z.number().int().positive().optional(),
  preferences: z.array(z.string()).optional(),
  options: z
    .object({
      use_highway: z.boolean().optional(),
      departure_time: z.string().optional(),
      max_drive_min: z.number().int().min(30).max(240).optional(),
      etc_card: z.boolean().optional(),
    })
    .optional(),
})
