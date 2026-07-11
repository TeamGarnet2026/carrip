'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { loadPlanSession } from '@/lib/plan/storage'

export function GeneratingPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('id')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!planId || !loadPlanSession(planId)) {
      router.replace('/plan/new?step=1')
      return
    }

    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(95, current + 3))
    }, 500)

    const redirectTimer = window.setTimeout(() => {
      router.replace(`/plan/${planId}/routes`)
    }, 1200)

    return () => {
      window.clearInterval(progressTimer)
      window.clearTimeout(redirectTimer)
    }
  }, [planId, router])

  return (
    <div className="carrip-loading-card grid justify-items-center gap-4">
      <Spinner size="lg" label="ルート生成中" />
      <div>
        <h2 className="m-0 text-2xl font-black text-ink">
          ルート候補ページへ移動中
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          次の画面でスタブ表示または API 生成を選べます
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#e5ecef]">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted">しばらくお待ちください</p>
    </div>
  )
}
