import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { TripDetailView } from '@/components/trip/trip-detail-view'
import { getTripDetailForUser } from '@/lib/trips/service'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type TripDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  let detail
  try {
    detail = await getTripDetailForUser(supabase, user.id, id)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'データの取得に失敗しました'
    return (
      <AppShell email={user.email} showLogout title="プラン詳細">
        <div className="carrip-panel p-6 text-sm text-red-700">{message}</div>
        <Link
          href="/trips"
          className="mt-4 inline-block text-sm font-extrabold text-brand-dark underline"
        >
          マイプランに戻る
        </Link>
      </AppShell>
    )
  }

  if (!detail) {
    notFound()
  }

  return (
    <AppShell
      email={user.email}
      showLogout
      title="プラン詳細"
      subtitle={`${detail.trip.origin} 出発 · ${detail.trip.prefecture?.join('、')}`}
    >
      <TripDetailView detail={detail} />
    </AppShell>
  )
}
