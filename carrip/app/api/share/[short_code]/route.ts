import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getShareByShortCode } from '@/lib/share/service'

type ShareParams = {
  params: Promise<{ short_code: string }>
}

export async function GET(_request: Request, { params }: ShareParams) {
  try {
    const { short_code } = await params
    const supabase = await createClient()
    const result = await getShareByShortCode(supabase, short_code)

    if (result.status === 'not_found') {
      return NextResponse.json(
        { error: 'ページが見つかりません', code: 'DR-AUTH-004' },
        { status: 404 }
      )
    }

    if (result.status === 'expired') {
      return NextResponse.json(
        {
          error:
            'この共有リンクは有効期限（7日）が切れています。幹事に新しいリンクを発行してもらってください。',
          code: 'DR-AUTH-003',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '共有情報の取得に失敗しました'
    console.error('GET /api/share/[short_code] failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
