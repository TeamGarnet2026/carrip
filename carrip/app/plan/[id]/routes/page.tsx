import Link from 'next/link'
import { RouteTestPanel } from '@/components/routes/route-test-panel'
import { SiteHeader } from '@/components/site-header'

export const runtime = 'edge'

type RouteCandidatesPageProps = {
  params: Promise<{ id: string }>
}

export default async function RouteCandidatesPage({
  params,
}: RouteCandidatesPageProps) {
  const { id } = await params

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="mb-2 text-sm text-neutral-500">プラン ID: {id}</p>
        <h1 className="mb-2 text-2xl font-bold">ルート候補（3案）</h1>
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          この画面はログインなしで閲覧できます（US-01 / P-07）。
        </p>

        <RouteTestPanel />

        <Link
          href={`/plan/${id}/confirmed`}
          className="inline-block rounded bg-neutral-900 px-5 py-3 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          このプランを保存する
        </Link>
        <p className="mt-3 text-xs text-neutral-500">
          未ログインの場合はログイン画面へ移動し、完了後に保存画面に戻ります。
        </p>
      </main>
    </>
  )
}
