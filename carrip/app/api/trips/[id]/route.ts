import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/api/auth'
import { deleteTripForUser, getTripDetailForUser } from '@/lib/trips/service'

export const runtime = 'edge'

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAuthUser()
  if (auth.response) return auth.response

  try {
    const { id } = await params
    const detail = await getTripDetailForUser(auth.supabase, auth.user.id, id)

    if (!detail) {
      return NextResponse.json(
        { error: '旅行プランが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(detail)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '旅行プランの取得に失敗しました'
    console.error('GET /api/trips/[id] failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireAuthUser()
  if (auth.response) return auth.response

  try {
    const { id } = await params
    const deleted = await deleteTripForUser(auth.supabase, auth.user.id, id)

    if (!deleted) {
      return NextResponse.json(
        { error: '旅行プランが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '旅行プランの削除に失敗しました'
    console.error('DELETE /api/trips/[id] failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
