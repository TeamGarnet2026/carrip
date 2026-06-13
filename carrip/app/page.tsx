import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <SiteHeader email={user?.email} showLogout={!!user} />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carrip</h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            ドライブ旅行向けに、観光ルートと費用（燃料・高速・駐車・入場）をまとめて提案します。
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/plan/demo/routes"
            className="rounded bg-neutral-900 px-5 py-3 text-center text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            ルート候補を見る（ログイン不要）
          </Link>
          <Link
            href={user ? '/trips' : '/login?redirectTo=%2Ftrips'}
            className="rounded border border-neutral-300 px-5 py-3 text-center text-sm font-medium dark:border-neutral-700"
          >
            マイプラン
          </Link>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          プランの保存・共有はログイン後に利用できます。ルート候補の閲覧はアカウント不要です。
        </p>
      </main>
    </>
  )
}
