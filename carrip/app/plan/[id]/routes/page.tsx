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
    <AppShell>
      <RoutesListPanel planId={id} />
    </AppShell>
  )
}
