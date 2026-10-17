import * as Sentry from '@sentry/nextjs'

// サーバー起動時に一度だけ呼ばれる。ランタイムごとに Sentry を初期化する
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Server Components・Route Handlers・proxy で捕捉されなかったエラーを Sentry に送る
export const onRequestError = Sentry.captureRequestError
