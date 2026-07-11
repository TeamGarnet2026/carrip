import { SiteHeader } from '@/components/site-header'
import { SharePanel } from '@/components/share/share-panel'
import { PageHeader } from '@/components/layout/page-header'
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

  const backHref = routeId ? `/trips/${id}` : `/plan/${id}/routes`

  return (
    <>
      <SiteHeader email={user?.email} showLogout={!!user} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <PageHeader title="LINE共有" showBack backHref={backHref} />
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          共有URLまたはQRコードでメンバーに旅程を送れます。
        </p>
        <SharePanel planId={id} routeId={routeId} />
      </main>
    </>
  )
}
