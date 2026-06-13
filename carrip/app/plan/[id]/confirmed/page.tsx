import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

type PlanConfirmedPageProps = {
  params: Promise<{ id: string }>
}

export default async function PlanConfirmedPage({
  params,
}: PlanConfirmedPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <SiteHeader email={user?.email} showLogout />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-2 text-2xl font-bold">プラン確定・保存</h1>
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          プラン ID: {id} — ログイン済みのためこの画面にアクセスできています（P-09）。
        </p>
        <div className="rounded border border-dashed border-neutral-300 p-6 text-sm dark:border-neutral-700">
          <p className="mb-4">
            ここで <code className="text-xs">POST /api/trips</code>{' '}
            により DB へ保存する処理を実装します（BE 連携）。
          </p>
          <p className="text-neutral-600 dark:text-neutral-400">
            ログイン中: {user?.email}
          </p>
        </div>
        <div className="mt-6 flex gap-4 text-sm">
          <Link href={`/plan/${id}/routes`} className="underline">
            候補一覧に戻る
          </Link>
          <Link href="/trips" className="underline">
            マイプランへ
          </Link>
        </div>
      </main>
    </>
  )
}
