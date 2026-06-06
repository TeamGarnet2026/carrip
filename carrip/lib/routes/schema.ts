import { z } from 'zod'

export const routeGenerateSchema = z.object({
  origin: z.string().min(1),
  prefecture: z.array(z.string()).min(1).max(5),
  departure_date: z.string().min(1),
  days: z.number().int().min(1).max(3),
  people: z.number().int().min(1).max(10),
  vehicle: z.object({
    type: z.string().min(1),
    fuel_km_l: z.number().min(1).max(200).optional(),
  }),
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
