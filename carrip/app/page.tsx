export const runtime = 'edge';

import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <SiteHeader email={user?.email} showLogout={!!user} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Carrip / カーリップ
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              グループドライブ旅行を、
              <span className="text-teal-700 dark:text-teal-400">
                費用込み
              </span>
              で計画
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
              都道府県と条件を入力するだけで、燃料費・高速料金・駐車料・入場料を含めた
              観光ルートを3案提案。幹事も参加者も、予算内で無理のない旅程を共有できます。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/plan/new?step=1">
                <Button size="lg">旅程を作成する</Button>
              </Link>
              <Link href={user ? '/trips' : '/login?redirectTo=%2Ftrips'}>
                <Button variant="secondary" size="lg">
                  マイプラン
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-neutral-500">
              ルート候補の閲覧はログイン不要。保存・共有はログイン後に利用できます。
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm dark:border-neutral-800 dark:from-teal-950/40 dark:to-neutral-950">
            <h2 className="text-lg font-semibold">こんな方におすすめ</h2>
            <ul className="mt-4 space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
              <li>週末ドライブで費用を事前に把握したい</li>
              <li>子連れ・グループ旅行の幹事としてルートを共有したい</li>
              <li>高速を使うか下道で行くか、予算に合わせて比較したい</li>
            </ul>
            <div className="mt-6 grid grid-cols-2 gap-3 text-center text-sm">
              <FeatureCard label="候補ルート" value="3案" />
              <FeatureCard label="費用内訳" value="4項目" />
              <FeatureCard label="訪問エリア" value="最大5県" />
              <FeatureCard label="共有" value="LINE / QR" />
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

function FeatureCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-teal-700 dark:text-teal-400">
        {value}
      </p>
    </div>
  )
}
