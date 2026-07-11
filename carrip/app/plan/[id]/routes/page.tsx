import { SiteHeader } from '@/components/site-header'
import { RoutesListPanel } from '@/components/plan/routes-list-panel'
import { PageHeader } from '@/components/layout/page-header'

type RouteCandidatesPageProps = {
  params: Promise<{ id: string }>
}

export default async function RouteCandidatesPage({
  params,
}: RouteCandidatesPageProps) {
  const { id } = await params

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <PageHeader title="ルート候補（3案）" showBack backHref="/plan/new?step=4" />
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          費用内訳付きの候補ルートから最適なプランを選んでください。
        </p>
        <RoutesListPanel planId={id} />
      </main>
    </>
  )
}
