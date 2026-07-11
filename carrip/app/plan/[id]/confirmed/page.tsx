import { AppShell } from '@/components/layout/app-shell'
import { TripSavePanel } from '@/components/plan/trip-save-panel'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type PlanConfirmedPageProps = {
  params: Promise<{ id: string }>
}

export default async function PlanConfirmedPage({
  params,
}: PlanConfirmedPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <AppShell
      email={user?.email}
      showLogout={!!user}
      title="プラン確定"
      subtitle="選択したルートを保存して、マイプランからいつでも確認できます"
    >
      <TripSavePanel planId={id} isLoggedIn={!!user} />
    </AppShell>
  )
}
