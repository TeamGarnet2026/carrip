import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
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
      <>
        <SiteHeader email={user?.email} showLogout />
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div>データの取得に失敗しました: {translateSupabaseError(error)}</div>
        </main>
      </>
    )
  }

  return (
    <>
      <SiteHeader email={user?.email} showLogout />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">マイプラン</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              保存済みの旅行プラン一覧
            </p>
          </div>
          <Link href="/plan/new?step=1">
            <Button size="sm">新規作成</Button>
          </Link>
        </div>

        {trips?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              保存済みプランはありません
            </p>
            <Link href="/plan/new?step=1" className="mt-4 inline-block">
              <Button>最初のプランを作成</Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
