// Node.js ランタイム（API ルート・サーバーレンダリング）の Sentry 初期化。instrumentation.ts から読み込む
import * as Sentry from '@sentry/nextjs'
import { sentryBaseOptions } from '@/lib/sentry/options'

Sentry.init({
  ...sentryBaseOptions('server'),
  // API ルートは例外を catch して console.error で記録し 500 を返すため、それも Sentry に送る
  integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
})
