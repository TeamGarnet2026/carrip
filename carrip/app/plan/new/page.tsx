import { Suspense } from 'react'
import { PlanWizard } from '@/components/plan/plan-wizard'
import { SiteHeader } from '@/components/site-header'

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
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Suspense fallback={<p className="text-sm text-neutral-500">読み込み中…</p>}>
          <PlanWizard initialStep={step} />
        </Suspense>
      </main>
    </>
  )
}
