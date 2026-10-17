/**
 * Sentry の共通設定。DSN が未設定の環境（ローカル・テスト）では送信しない。
 * サーバー・Edge・ブラウザの各初期化ファイルから使う。
 */

type SentryRuntime = 'server' | 'edge' | 'client'

export type SentryBaseOptions = {
  dsn: string | undefined
  enabled: boolean
  environment: string
  tracesSampleRate: number
  sendDefaultPii: boolean
}

const DEFAULT_TRACES_SAMPLE_RATE = 0.1

export function resolveSentryDsn(runtime: SentryRuntime): string | undefined {
  // ブラウザには NEXT_PUBLIC_ の値しか埋め込まれないため、サーバー側だけ SENTRY_DSN も見る
  const dsn =
    runtime === 'client'
      ? process.env.NEXT_PUBLIC_SENTRY_DSN
      : (process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN)
  return dsn?.trim() || undefined
}

export function resolveTracesSampleRate(raw: string | undefined): number {
  const rate = Number(raw)
  if (raw == null || raw === '' || !Number.isFinite(rate)) {
    return DEFAULT_TRACES_SAMPLE_RATE
  }
  return Math.min(1, Math.max(0, rate))
}

export function sentryBaseOptions(runtime: SentryRuntime): SentryBaseOptions {
  const dsn = resolveSentryDsn(runtime)
  return {
    dsn,
    enabled: Boolean(dsn),
    // Vercel では production / preview / development が入る
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      'development',
    tracesSampleRate: resolveTracesSampleRate(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
    ),
    // 共有URL・メールアドレスなどの個人情報を送らない
    sendDefaultPii: false,
  }
}
