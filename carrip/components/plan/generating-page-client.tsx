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
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-20 text-center">
      <Spinner size="lg" label="ルート生成中" />
      <div>
        <h1 className="text-xl font-bold">ルート候補ページへ移動中</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          次の画面でスタブ表示または API 生成を選べます
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-teal-600 transition-all dark:bg-teal-400"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-neutral-500">しばらくお待ちください</p>
    </div>
  )
}
