import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { createClient } from '@/utils/supabase/server'

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
          <div>データの取得に失敗しました: {error.message}</div>
        </main>
      </>
    )
  }

  return (
    <>
      <SiteHeader email={user?.email} showLogout />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-2 text-2xl font-bold">マイプラン</h1>
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          ログイン中のアカウントに紐づく旅行プランのみ表示されます。
        </p>
        {trips?.length === 0 ? (
          <p className="rounded border border-dashed border-neutral-300 p-6 text-sm dark:border-neutral-700">
            保存済みプランはありません。{' '}
            <Link href="/plan/demo/routes" className="underline">
              ルート候補を見る
            </Link>
            か、プラン確定画面から保存してください。
          </p>
        ) : (
          <ul className="space-y-3">
            {trips.map((trip) => (
              <li
                key={trip.id}
                className="rounded border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <p className="font-medium">{trip.origin} 出発</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {trip.days}日間 · {trip.people}人
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
