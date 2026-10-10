import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { BookmarkIcon, RouteIcon, WalletIcon } from '@/components/ui/icons'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=70'

const STEPS = [
  {
    icon: RouteIcon,
    title: '条件と行き先を選ぶ',
    body: '出発地・日程・人数・車種を入力して、行きたい場所を選びます。',
  },
  {
    icon: WalletIcon,
    title: 'ルートと費用を比較',
    body: '回る順番と、燃料費・高速料金・駐車料・入場料をまとめて比較できます。',
  },
  {
    icon: BookmarkIcon,
    title: '保存して共有',
    body: 'ログインするとプランを保存し、参加メンバーに共有できます。',
  },
]

export default function Home() {
  return (
    <AppShell variant="entry">
      <div className="grid gap-6">
        <section className="carrip-hero">
          {/* 画像最適化の設定を増やさずに済むよう、Unsplash 側でリサイズした画像を srcSet で渡す */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="carrip-hero-img"
            src={`${HERO_IMAGE}&w=1200`}
            srcSet={[640, 960, 1200, 1600]
              .map((width) => `${HERO_IMAGE}&w=${width} ${width}w`)
              .join(', ')}
            sizes="(max-width: 960px) 100vw, 1136px"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
          <div className="grid max-w-2xl gap-5">
            <p className="carrip-glass m-0 w-fit rounded-full px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-[13px] font-bold text-white/90">
              燃料費・高速料金・駐車料・入場料をまとめて計算
            </p>
            <h1 className="m-0 text-[clamp(23px,4.6vw,52px)] leading-[1.25] font-bold tracking-tight text-white">
              グループドライブ旅行を、
              <br />
              費用込みで計画
            </h1>
            <p className="m-0 max-w-xl text-[15px] leading-[1.9] text-white/80">
              行きたい場所を選ぶだけで、回る順番と燃料費・高速料金・駐車料・入場料を計算。幹事も参加者も、予算内で無理のない旅程を共有できます。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/plan/new?step=1">
                <Button size="lg">旅程を作成する</Button>
              </Link>
              {/* 未ログイン時は middleware が /login?redirectTo=/trips へ誘導する */}
              <Link href="/trips">
                <Button
                  variant="secondary"
                  size="lg"
                  className="!border-white/20 !bg-white/10 !text-white backdrop-blur hover:!bg-white/20"
                >
                  マイプラン
                </Button>
              </Link>
            </div>
            <p className="m-0 text-[13px] text-white/60">
              ルート候補の閲覧はログイン不要。保存・共有はログイン後に利用できます。
            </p>
          </div>
        </section>

        <section aria-labelledby="how-it-works">
          <h2
            id="how-it-works"
            className="mt-2 mb-3 text-[13px] font-bold tracking-wider text-muted"
          >
            使い方
          </h2>
          <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.title} className="carrip-panel flex gap-4 p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="m-0 text-xs font-bold text-brand">
                      STEP {index + 1}
                    </p>
                    <p className="mt-0.5 mb-1 text-[15px] font-bold text-ink">
                      {step.title}
                    </p>
                    <p className="m-0 text-[13px] leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </AppShell>
  )
}
