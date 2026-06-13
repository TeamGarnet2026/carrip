import { NextResponse } from 'next/server'
import { checkGeminiHealth } from '@/lib/gemini/health'

export const runtime = 'edge'

export async function GET() {
  try {
    const health = await checkGeminiHealth()

    // 診断結果は JSON で返す（クォータ超過なども詳細を見せる）
    return NextResponse.json(health, {
      status: health.configured ? 200 : 503,
    })
  } catch (error) {
    console.error('GET /api/health/gemini failed:', error)
    return NextResponse.json(
      {
        ok: false,
        configured: Boolean(process.env.GEMINI_API_KEY),
        reason: 'api_error' as const,
        model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
        message: 'Gemini の診断に失敗しました',
        fix_steps: ['GEMINI_API_KEY を確認してください'],
      },
      { status: 500 }
    )
  }
}
