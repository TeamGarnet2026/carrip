import { AppShell } from '@/components/layout/app-shell'
import { RoutesListPanel } from '@/components/plan/routes-list-panel'

export const runtime = 'edge'

type RouteCandidatesPageProps = {
  params: Promise<{ id: string }>
}

export default async function RouteCandidatesPage({
  params,
}: RouteCandidatesPageProps) {
  const { id } = await params

  return (
    <AppShell
      title="ルートと料金"
      subtitle="選んだ行き先を回るルートと、比較用の直行ルートの費用です"
    >
      <RoutesListPanel planId={id} />
    </AppShell>
  )
}
