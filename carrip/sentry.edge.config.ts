// Edge ランタイム（proxy / middleware・runtime = 'edge' のページ）の Sentry 初期化。instrumentation.ts から読み込む
import * as Sentry from '@sentry/nextjs'
import { sentryBaseOptions } from '@/lib/sentry/options'

Sentry.init({
  ...sentryBaseOptions('edge'),
  integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
})
