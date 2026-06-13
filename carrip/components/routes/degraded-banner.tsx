import type { DegradedReason } from '@/lib/routes/degraded'
import { getDegradedBannerMessages } from '@/lib/routes/degraded'

type DegradedBannerProps = {
  degraded?: boolean
  degradedReasons?: DegradedReason[]
}

export function DegradedBanner({
  degraded,
  degradedReasons = [],
}: DegradedBannerProps) {
  if (!degraded && degradedReasons.length === 0) {
    return null
  }

  const messages =
    degradedReasons.length > 0
      ? getDegradedBannerMessages(degradedReasons)
      : [
          '一部の外部APIが利用できないため、概算値で計算しています。精度が低下している可能性があります',
        ]

  return (
    <div
      className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
      role="alert"
    >
      <p className="font-medium">外部API障害 — 概算モードで表示中</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  )
}
