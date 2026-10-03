import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { CarIcon } from '@/components/ui/icons'

export default function Home() {
  return (
    <AppShell variant="entry">
      <div className="grid w-full max-w-5xl gap-7 text-white">
        <div className="inline-flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
          <span className="carrip-brand-mark" aria-hidden>
            <CarIcon />
          </span>
          Carrip
        </div>
        <p className="carrip-glass m-0 w-fit rounded-full px-4 py-1.5 text-[13px] font-bold text-white/90">
          燃料費・高速料金・駐車料・入場料をまとめて計算
        </p>
        <h1 className="m-0 text-[clamp(36px,6.4vw,68px)] leading-[1.12] font-bold tracking-tight text-white">
          グループドライブ旅行を、
          <br />
          費用込みで計画
        </h1>
        <p className="m-0 max-w-xl text-base leading-[1.9] text-white/80">
          行きたい場所を選ぶだけで、回る順番と燃料費・高速料金・駐車料・入場料を計算。幹事も参加者も、予算内で無理のない旅程を共有できます。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/plan/new?step=1">
            <Button size="lg">旅程を作成する</Button>
          </Link>
          {/* 未ログイン時は middleware が /login?redirectTo=/trips へ誘導する */}
          <Link href="/trips">
            <Button variant="secondary" size="lg" className="!border-white/20 !bg-white/10 !text-white backdrop-blur hover:!bg-white/20">
              マイプラン
            </Button>
          </Link>
        </div>
        <p className="m-0 text-[13px] text-white/60">
          ルート候補の閲覧はログイン不要。保存・共有はログイン後に利用できます。
        </p>
      </div>
    </AppShell>
  )
}
