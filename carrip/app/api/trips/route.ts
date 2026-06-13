import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuthUser } from '@/lib/api/auth'
import { createTripSchema } from '@/lib/trips/schema'
import {
  createTripForUser,
  listTripsForUser,
} from '@/lib/trips/service'

export async function GET() {
  const auth = await requireAuthUser()
  if (auth.response) return auth.response

  try {
    const trips = await listTripsForUser(auth.supabase, auth.user.id)
    return NextResponse.json({ trips, count: trips.length })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '旅行プラン一覧の取得に失敗しました'
    console.error('GET /api/trips failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthUser()
  if (auth.response) return auth.response

  try {
    const body = await request.json()
    const input = createTripSchema.parse(body)
    const saved = await createTripForUser(auth.supabase, auth.user.id, input)

    return NextResponse.json(
      {
        trip: saved.trip,
        route: saved.route,
        stop_count: saved.stop_count,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: error.flatten() },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : '旅行プランの保存に失敗しました'
    console.error('POST /api/trips failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
