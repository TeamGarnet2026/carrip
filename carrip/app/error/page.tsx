import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'

type ErrorPageProps = {
  searchParams: Promise<{ code?: string; message?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  'DR-RTE-003':
    'ルートの生成に時間がかかっています。しばらく待ってから再試行してください。',
  'DR-RTE-001':
    '指定条件でルートを組めませんでした。条件を変更してもう一度お試しください。',
  'DR-AUTH-003':
    'この共有リンクは有効期限が切れています。幹事に新しいリンクを発行してもらってください。',
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams
  const message =
    params.message ??
    (params.code ? ERROR_MESSAGES[params.code] : undefined) ??
    '予期せぬエラーが発生しました。しばらく後にお試しください。'

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">エラー</h1>
        <p className="text-neutral-600 dark:text-neutral-400">{message}</p>
        {params.code && (
          <p className="text-xs text-neutral-500">エラーコード: {params.code}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/plan/new?step=1">
            <Button>旅程を作り直す</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">トップへ戻る</Button>
          </Link>
        </div>
      </main>
    </>
  )
}
