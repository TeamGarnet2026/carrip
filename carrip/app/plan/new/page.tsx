import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { PlanWizard } from '@/components/plan/plan-wizard'
import { PREFECTURE_META } from '@/lib/plan/prefecture-meta'

type PlanNewPageProps = {
  searchParams: Promise<{
    step?: string
    origin?: string
    date?: string
    days?: string
    people?: string
    vehicle?: string
    prefecture?: string
  }>
}

function restorePlanWizardStep(step: number): number {
  if (!Number.isFinite(step)) return 1
  return Math.min(4, Math.max(1, step))
}

function clampInt(raw: string | undefined, min: number, max: number): number | undefined {
  const value = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(value)) return undefined
  return Math.min(max, Math.max(min, value))
}

/** トップのクイック入力・エリアから引き継いだ値（不正な値は無視する） */
function parseInitialValues(params: Awaited<PlanNewPageProps['searchParams']>) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date : undefined
  const prefecture =
    params.prefecture && PREFECTURE_META[params.prefecture] ? [params.prefecture] : undefined
  return {
    origin: params.origin?.trim().slice(0, 100) || undefined,
    departureDate: date,
    days: clampInt(params.days, 1, 7),
    people: clampInt(params.people, 1, 15),
    vehicleType: params.vehicle,
    prefecture,
  }
}

export default async function PlanNewPage({ searchParams }: PlanNewPageProps) {
  const params = await searchParams
  const step = restorePlanWizardStep(Number(params.step ?? '1'))

  return (
    <AppShell>
      <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
        <PlanWizard initialStep={step} initialValues={parseInitialValues(params)} />
      </Suspense>
    </AppShell>
  )
}
