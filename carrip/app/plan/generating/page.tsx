import { Suspense } from 'react'
import { GeneratingPageClient } from '@/components/plan/generating-page-client'
import { SiteHeader } from '@/components/site-header'

export default function PlanGeneratingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Suspense fallback={<p className="text-center text-sm">準備中…</p>}>
          <GeneratingPageClient />
        </Suspense>
      </main>
    </>
  )
}
