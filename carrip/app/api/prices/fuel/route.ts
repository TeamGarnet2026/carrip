import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  resolveFuelPriceForVehicle,
  resolveFuelPricesWithFallback,
} from '@/lib/prices/fuel'
import { fuelPriceQuerySchema } from '@/lib/prices/schema'


export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = fuelPriceQuerySchema.parse({
      prefecture: url.searchParams.get('prefecture') ?? undefined,
      fuel_type: url.searchParams.get('fuel_type') ?? undefined,
    })

    if (query.fuel_type) {
      const result = await resolveFuelPriceForVehicle(query.prefecture, {
        type: 'custom',
        fuel_type: query.fuel_type,
      })
      return NextResponse.json(result)
    }

    const result = await resolveFuelPricesWithFallback(query.prefecture)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: error.flatten() },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : '燃料単価の取得に失敗しました'
    console.error('GET /api/prices/fuel failed:', error)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
