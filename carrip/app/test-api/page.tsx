import { notFound } from 'next/navigation'
import { ApiTestPanel } from '@/components/dev/api-test-panel'
import { SiteHeader } from '@/components/site-header'
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
    <>
      <SiteHeader email={user?.email} showLogout={Boolean(user)} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-2 text-2xl font-bold">API 手動テスト</h1>
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          開発環境専用ページです。ボタンを押したときだけ外部 API が呼ばれます。
        </p>
        <ApiTestPanel isLoggedIn={Boolean(user)} userEmail={user?.email} />
      </main>
    </>
  )
}
