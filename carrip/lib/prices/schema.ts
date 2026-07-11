import { z } from 'zod'

const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const tollPriceQuerySchema = z.object({
  start: latLngSchema,
  goal: latLngSchema,
  via: z.array(latLngSchema).max(10).optional(),
  vehicle_type: z
    .enum(['compact', 'kei', 'sedan', 'suv', 'minivan', 'custom'])
    .default('compact'),
  use_highway: z.coerce.boolean().optional().default(true),
  etc_card: z.coerce.boolean().optional().default(true),
  departure_date: z.string().optional(),
  departure_time: z.string().optional(),
})

export type TollPriceQuery = z.infer<typeof tollPriceQuerySchema>

export type FuelPriceQuery = z.infer<typeof fuelPriceQuerySchema>

export const fuelPriceQuerySchema = z.object({
  prefecture: z.string().min(1),
  fuel_type: z.enum(['diesel', 'regular', 'premium']).optional(),
})
