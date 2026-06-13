import { NextResponse } from 'next/server'
import { checkGoogleMapsHealth } from '@/lib/google/maps-health'

export const runtime = 'edge'

export async function GET() {
  try {
    const health = await checkGoogleMapsHealth()
    return NextResponse.json(health, { status: health.ok ? 200 : 503 })
  } catch (error) {
    console.error('GET /api/health/google-maps failed:', error)
    return NextResponse.json(
      {
        ok: false,
        message: 'Google Maps の診断に失敗しました',
        fix_steps: ['GOOGLE_CLOUD_API_KEY を確認してください'],
      },
      { status: 500 }
    )
  }
}
