import { SiteHeader } from '@/components/site-header'
import { TripSavePanel } from '@/components/plan/trip-save-panel'
import { PageHeader } from '@/components/layout/page-header'
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
    <>
      <SiteHeader email={user?.email} showLogout={!!user} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <PageHeader
          title="プラン確定"
          showBack
          backHref={`/plan/${id}/routes`}
        />
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          選択したルートを保存して、マイプランからいつでも確認できます。
        </p>
        <TripSavePanel planId={id} isLoggedIn={!!user} />
      </main>
    </>
  )
}
