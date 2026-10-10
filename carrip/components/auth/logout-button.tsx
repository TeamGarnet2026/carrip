'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setLoading(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="min-h-[38px] rounded-lg border border-line-strong bg-surface px-3.5 text-[13px] font-medium text-ink transition hover:bg-soft disabled:opacity-50"
    >
      {loading ? 'ログアウト中…' : 'ログアウト'}
    </button>
  )
}
