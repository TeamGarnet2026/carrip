import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { AlertIcon } from '@/components/ui/icons'

type ErrorPageProps = {
  searchParams: Promise<{ code?: string; message?: string }>
}

const ERRORS: Record<string, { title: string; message: string }> = {
  'DR-RTE-003': {
    title: 'ルートの計算に時間がかかっています',
    message: 'ルートの生成に時間がかかっています。しばらく待ってから再試行してください。',
  },
  'DR-RTE-001': {
    title: 'ルートを組めませんでした',
    message: '指定した条件でルートを組めませんでした。行き先や条件を変えて、もう一度お試しください。',
  },
  'DR-AUTH-003': {
    title: '共有リンクの期限が切れています',
    message: 'この共有リンクは有効期限が切れています。幹事に新しいリンクを発行してもらってください。',
  },
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams
  const known = params.code ? ERRORS[params.code] : undefined
  const title = known?.title ?? '問題が発生しました'
  const message =
    params.message ??
    known?.message ??
    '予期せぬエラーが発生しました。しばらく後にお試しください。'

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[800px] py-8 md:py-24">
        <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-[#f6e4dd] text-[#8a3f27]">
          <AlertIcon className="h-8 w-8" />
        </span>
        <h1 className="mt-8 mb-0 text-[28px] leading-tight font-bold md:text-[40px]">{title}</h1>
        <p className="mt-6 mb-0 text-base leading-[1.9] text-ink-soft">{message}</p>
        {params.code && (
          <p className="mt-5 mb-0 text-[13px] text-muted">エラーコード: {params.code}</p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/plan/new?step=1">
            <Button size="lg">旅程を作り直す</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary" size="lg">
              トップへ戻る
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
