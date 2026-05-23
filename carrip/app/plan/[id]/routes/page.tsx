import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'

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
        <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">
          この画面はログインなしで閲覧できます（US-01 / P-07）。
          実装が進むと、ここに API から取得した3案が表示されます。
        </p>
        <ul className="mb-8 space-y-3">
          {['コスト重視ルート', 'バランスタイプ', '景観重視ルート'].map(
            (title, index) => (
              <li
                key={title}
                className="rounded border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <p className="font-medium">
                  案{index + 1}: {title}
                </p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  総距離 · 総時間 · 総費用 · 1人あたり（モック表示）
                </p>
              </li>
            )
          )}
        </ul>
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
