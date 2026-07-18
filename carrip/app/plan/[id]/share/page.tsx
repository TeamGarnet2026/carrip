import { AppShell } from '@/components/layout/app-shell'
import { SharePanel } from '@/components/share/share-panel'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type PlanSharePageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ routeId?: string }>
}

export default async function PlanSharePage({
  params,
  searchParams,
}: PlanSharePageProps) {
  const { id } = await params
  const { routeId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <AppShell
      email={user?.email}
      showLogout={!!user}
      title="LINE共有"
      subtitle="共有URLまたはQRコードでメンバーに旅程を送れます"
    >
      <SharePanel planId={id} routeId={routeId} />
    </AppShell>
  )
}
