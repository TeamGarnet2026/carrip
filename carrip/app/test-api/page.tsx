import { notFound } from 'next/navigation'
import { ApiTestPanel } from '@/components/dev/api-test-panel'
import { AppShell } from '@/components/layout/app-shell'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function TestApiPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <AppShell
      email={user?.email}
      showLogout={Boolean(user)}
      title="API 手動テスト"
      subtitle="開発環境専用ページです"
    >
      <ApiTestPanel isLoggedIn={Boolean(user)} userEmail={user?.email} />
    </AppShell>
  )
}
