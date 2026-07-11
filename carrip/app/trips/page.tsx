import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { TripCard } from '@/components/trip/trip-card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'
import { translateSupabaseError } from '@/utils/supabase/error-messages'

export const dynamic = 'force-dynamic'

export default async function TripsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: trips, error } = await supabase.from('trips').select('*')

  if (error) {
    return (
      <AppShell email={user?.email} showLogout title="マイプラン">
        <div className="carrip-panel p-6 text-sm text-red-700">
          データの取得に失敗しました: {translateSupabaseError(error)}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      email={user?.email}
      showLogout
      title="マイプラン"
      subtitle="保存済みの旅行プラン一覧"
      actions={
        <Link href="/plan/new?step=1">
          <Button size="sm">新規作成</Button>
        </Link>
      }
    >
      {trips?.length === 0 ? (
        <div className="carrip-panel border-dashed p-8 text-center">
          <p className="text-sm text-muted">保存済みプランはありません</p>
          <Link href="/plan/new?step=1" className="mt-4 inline-block">
            <Button>最初のプランを作成</Button>
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </ul>
      )}
    </AppShell>
  )
}
