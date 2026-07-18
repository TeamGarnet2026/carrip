import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
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
    <AppShell variant="center">
      <div className="carrip-panel p-8 text-center">
        <h1 className="text-2xl font-black text-ink">エラー</h1>
        <p className="mt-3 text-muted">{message}</p>
        {params.code && (
          <p className="mt-2 text-xs text-muted">エラーコード: {params.code}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/plan/new?step=1">
            <Button>旅程を作り直す</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">トップへ戻る</Button>
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
