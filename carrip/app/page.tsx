import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <AppShell variant="entry">
      <div className="grid w-full max-w-3xl gap-6 text-white">
        <div className="inline-flex items-center gap-3 text-2xl font-black text-white">
          <span className="carrip-brand-mark" aria-hidden>
            🚗
          </span>
          Carrip
        </div>
        <h1 className="m-0 text-[clamp(34px,6vw,62px)] leading-[1.16] font-black text-white">
          グループドライブ旅行を、
          <br />
          費用込みで計画
        </h1>
        <p className="m-0 max-w-xl text-[15px] leading-[1.8] text-[#dce9ea]">
          都道府県と条件を入力するだけで、燃料費・高速料金・駐車料・入場料を含めた観光ルートを3案提案。幹事も参加者も、予算内で無理のない旅程を共有できます。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/plan/new?step=1">
            <Button size="lg">旅程を作成する</Button>
          </Link>
          <Link href={user ? '/trips' : '/login?redirectTo=%2Ftrips'}>
            <Button variant="secondary" size="lg" className="!bg-white/95">
              マイプラン
            </Button>
          </Link>
        </div>
        <p className="text-sm text-[#c9d9dc]">
          ルート候補の閲覧はログイン不要。保存・共有はログイン後に利用できます。
        </p>
      </div>
    </AppShell>
  )
}
