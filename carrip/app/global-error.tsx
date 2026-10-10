'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import './globals.css'

// ルートレイアウトを含めて描画に失敗したときの画面。エラーは Sentry に送る
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ja">
      <body className="min-h-dvh bg-bg text-ink">
        <title>エラー | Carrip</title>
        <main className="mx-auto flex min-h-dvh max-w-lg items-center p-6">
          <div className="carrip-panel w-full p-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              予期せぬエラーが発生しました
            </h1>
            <p className="mt-3 text-muted">
              しばらく後にお試しください。解決しない場合は、下のエラーIDを添えてお問い合わせください。
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-muted">エラーID: {error.digest}</p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="min-h-[44px] rounded-[10px] bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark"
              >
                もう一度試す
              </button>
              {/* ルートレイアウトが壊れている可能性があるため、Link ではなく通常の遷移で戻す */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex min-h-[44px] items-center rounded-[10px] border border-line bg-surface px-5 py-2 text-sm font-bold text-ink transition hover:bg-soft"
              >
                トップへ戻る
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
