import { AppShell } from '@/components/layout/app-shell'
import { TripSavePanel } from '@/components/plan/trip-save-panel'
import { getUserWithTimeout } from '@/utils/supabase/get-user'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'
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
  } = await getUserWithTimeout(supabase)

  return (
    <AppShell
      email={user?.email}
      showLogout={!!user}
    >
      <TripSavePanel planId={id} isLoggedIn={!!user} />
    </AppShell>
  )
}
