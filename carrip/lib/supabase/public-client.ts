import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/** 公開テーブル読み取り用（cookies 不要・バッチ/API/テストで共用） */
export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
