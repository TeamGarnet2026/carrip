import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { TripCard } from '@/components/trip/trip-card'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@/components/ui/icons'
import { listTripsForUser } from '@/lib/trips/service'
import { getUserWithTimeout } from '@/utils/supabase/get-user'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default async function TripsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await getUserWithTimeout(supabase)

  if (!user) {
    return (
      <AppShell title="マイプラン">
        <div className="carrip-panel p-8 text-sm text-ink-soft">
          ログインすると保存したプランを表示できます。
          <Link href="/login?redirectTo=%2Ftrips" className="ml-2">
            ログイン
          </Link>
        </div>
      </AppShell>
    )
  }

  let trips
  try {
    trips = await listTripsForUser(supabase, user.id)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'データの取得に失敗しました'
    return (
      <AppShell email={user.email} showLogout title="マイプラン">
        <div className="carrip-panel p-6 text-sm text-red-700">
          データの取得に失敗しました: {message}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      email={user.email}
      showLogout
      title="マイプラン"
      subtitle="保存した旅行プラン"
      actions={
        <Link href="/plan/new?step=1">
          <Button leftIcon={<PlusIcon className="h-4 w-4" />}>新しいプラン</Button>
        </Link>
      }
    >
      <ul className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        <li>
          <Link
            href="/plan/new?step=1"
            className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-line-strong text-ink-soft no-underline transition hover:border-muted hover:text-ink"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full border border-line-strong">
              <PlusIcon className="h-6 w-6" />
            </span>
            {trips.length === 0 ? '最初の旅行を計画する' : '次の旅行を計画する'}
          </Link>
        </li>
      </ul>
    </AppShell>
  )
}
