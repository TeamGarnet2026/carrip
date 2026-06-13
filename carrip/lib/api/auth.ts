import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase,
      response: NextResponse.json({ error: '認証が必要です' }, { status: 401 }),
    }
  }

  return { user, supabase, response: null }
}
