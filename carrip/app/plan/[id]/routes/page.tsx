import { AppShell } from '@/components/layout/app-shell'
import { RoutesListPanel } from '@/components/plan/routes-list-panel'

type RouteCandidatesPageProps = {
  params: Promise<{ id: string }>
}

export default async function RouteCandidatesPage({
  params,
}: RouteCandidatesPageProps) {
  const { id } = await params

  return (
    <AppShell
      title="ルート候補（3案）"
      subtitle="費用内訳付きの候補ルートから最適なプランを選んでください"
    >
      <RoutesListPanel planId={id} />
    </AppShell>
  )
}
