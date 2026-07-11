import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { TripDetailView } from '@/components/trip/trip-detail-view'
import { SiteHeader } from '@/components/site-header'
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
      <>
        <SiteHeader email={user.email} showLogout />
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div>データの取得に失敗しました: {message}</div>
          <Link href="/trips" className="mt-4 inline-block text-sm underline">
            マイプランに戻る
          </Link>
        </main>
      </>
    )
  }

  if (!detail) {
    notFound()
  }

  return (
    <>
      <SiteHeader email={user.email} showLogout />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <PageHeader title="プラン詳細" showBack backHref="/trips" />
        <TripDetailView detail={detail} />
      </main>
    </>
  )
}
