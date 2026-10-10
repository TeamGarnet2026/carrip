// ブラウザでアプリが操作可能になる前に読み込まれる。画面側のエラーを Sentry に送る
import * as Sentry from '@sentry/nextjs'
import { sentryBaseOptions } from '@/lib/sentry/options'

Sentry.init(sentryBaseOptions('client'))

// 画面遷移の計測（パフォーマンス）
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
