import { Suspense } from 'react'
import { GeneratingPageClient } from '@/components/plan/generating-page-client'
import { AppShell } from '@/components/layout/app-shell'

export default function PlanGeneratingPage() {
  return (
    <AppShell
      title="ルートを生成中"
      subtitle="候補ルートと費用を計算しています"
      variant="app"
    >
      <div className="flex min-h-[60vh] items-center justify-center">
        <Suspense fallback={<p className="text-center text-sm text-muted">準備中…</p>}>
          <GeneratingPageClient />
        </Suspense>
      </div>
    </AppShell>
  )
}
