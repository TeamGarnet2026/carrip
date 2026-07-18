import { Suspense } from 'react'
import { PlanWizard } from '@/components/plan/plan-wizard'
import { AppShell } from '@/components/layout/app-shell'

type PlanNewPageProps = {
  searchParams: Promise<{ step?: string }>
}

function restorePlanWizardStep(step: number): number {
  if (!Number.isFinite(step)) return 1
  return Math.min(4, Math.max(1, step))
}

export default async function PlanNewPage({ searchParams }: PlanNewPageProps) {
  const params = await searchParams
  const step = restorePlanWizardStep(Number(params.step ?? '1'))

  return (
    <AppShell
      title="新しい旅程を作成"
      subtitle="出発地・訪問先・車両条件を入力してください"
    >
      <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
        <PlanWizard initialStep={step} />
      </Suspense>
    </AppShell>
  )
}
