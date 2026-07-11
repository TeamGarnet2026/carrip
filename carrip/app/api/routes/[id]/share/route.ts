import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/api/auth'
import { createShareForRoute } from '@/lib/share/service'

type RouteShareParams = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteShareParams) {
  const auth = await requireAuthUser()
  if (auth.response) return auth.response

  try {
    const { id: routeId } = await params
    const baseUrl = new URL(_request.url).origin
    const share = await createShareForRoute(
      auth.supabase,
      routeId,
      auth.user.id,
      baseUrl
    )

    if (!share) {
      return NextResponse.json(
        { error: 'このルートを共有する権限がありません', code: 'DR-AUTH-002' },
        { status: 403 }
      )
    }

    return NextResponse.json(share)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '共有URLの生成に失敗しました'
    console.error('POST /api/routes/[id]/share failed:', error)
    return NextResponse.json({ error: message, code: 'DR-EXT-006' }, { status: 503 })
  }
}
