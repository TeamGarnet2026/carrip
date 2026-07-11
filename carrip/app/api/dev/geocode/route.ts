import { NextResponse } from 'next/server'
import { devOnlyGuard } from '@/lib/dev/guard'
import { geocodeAddress } from '@/lib/google/places'

export async function GET(request: Request) {
  const blocked = devOnlyGuard()
  if (blocked) return blocked

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'q パラメータが必要です' }, { status: 400 })
  }

  try {
    const location = await geocodeAddress(query)
    if (!location) {
      return NextResponse.json(
        { error: '位置情報を取得できませんでした' },
        { status: 404 }
      )
    }

    return NextResponse.json({ query, location })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ジオコーディングに失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
