import Link from 'next/link'
import { QuickStartForm } from '@/components/home/quick-start-form'
import { AppShell } from '@/components/layout/app-shell'
import { formatJapaneseDate, formatTripLength } from '@/lib/format'
import { listTripsForUser } from '@/lib/trips/service'
import { getUserWithTimeout } from '@/utils/supabase/get-user'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=70'

const COST_ITEMS = [
  {
    no: '01',
    title: '燃料費',
    body: '都道府県ごとの最新ガソリン価格と、車種の燃費から計算します。',
    dot: 'bg-cost-fuel',
  },
  {
    no: '02',
    title: '高速料金',
    body: '実際の経路の料金に、ETC割引の有無を反映します。',
    dot: 'bg-cost-toll',
  },
  {
    no: '03',
    title: '駐車料',
    body: '立ち寄り先の近くの駐車場と滞在時間から見積もります。手動で直すこともできます。',
    dot: 'bg-cost-parking',
  },
  {
    no: '04',
    title: '入場料',
    body: '拝観料や施設の入場料を、人数分まとめて加算します。',
    dot: 'bg-cost-admission',
  },
]

const AREAS = [
  { name: '京都', prefecture: '京都府', tags: '寺社・紅葉・日帰り向き', color: 'bg-photo-2' },
  { name: '箱根', prefecture: '神奈川県', tags: '温泉・美術館・絶景', color: 'bg-photo-3' },
  { name: '伊豆', prefecture: '静岡県', tags: '海岸線・グルメ', color: 'bg-photo-1' },
  { name: '軽井沢', prefecture: '長野県', tags: '高原・体験・穴場', color: 'bg-photo-4' },
]

type RecentTrip = Awaited<ReturnType<typeof listTripsForUser>>[number]

/** ログイン中なら最近のプランを返す。未ログイン・取得失敗時は何も出さない */
async function loadAccount(): Promise<{ email: string | null; trips: RecentTrip[] }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await getUserWithTimeout(supabase)
    if (!user) return { email: null, trips: [] }
    const trips = await listTripsForUser(supabase, user.id).catch(() => [])
    return { email: user.email ?? null, trips: trips.slice(0, 3) }
  } catch {
    return { email: null, trips: [] }
  }
}

export default async function Home() {
  const { email, trips } = await loadAccount()

  return (
    <AppShell variant="entry" email={email} showLogout={Boolean(email)}>
      <div className="mx-auto w-full max-w-[1240px] px-5 pt-6 pb-16 md:px-8 md:pt-12">
        <section className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="order-2 flex flex-col gap-5 md:order-1">
            <p className="m-0 hidden text-[13px] text-muted md:block">
              グループドライブの計画と割り勘
            </p>
            <h1 className="m-0 text-[30px] leading-[1.25] font-bold md:text-[54px] md:leading-[1.15]">
              みんなで行く
              <br className="hidden md:block" />
              ドライブを、
              <br />
              費用ごと決める。
            </h1>
            <p className="m-0 hidden max-w-[440px] text-[15px] leading-[1.9] text-ink-soft md:block">
              行きたい場所を選ぶと、回る順番と燃料費・高速料金・駐車料・入場料を計算。1人あたりの金額まで出して、そのままLINEで共有できます。
            </p>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="carrip-photo aspect-[4/3] md:aspect-[5/4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${HERO_IMAGE}&w=1200`}
                srcSet={[640, 960, 1200]
                  .map((width) => `${HERO_IMAGE}&w=${width} ${width}w`)
                  .join(', ')}
                sizes="(max-width: 768px) 100vw, 600px"
                alt=""
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="absolute right-4 bottom-4 hidden w-[300px] rounded-2xl bg-surface p-5 shadow-[var(--shadow-raised)] md:block">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>京都 日帰り・4人</span>
                <span>案1</span>
              </div>
              <p className="mt-3 mb-0 text-[32px] leading-none font-semibold tracking-[-0.02em]">
                ¥2,850<span className="ml-1 text-sm font-normal text-muted">/ 1人</span>
              </p>
              <div className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                <span className="w-[23%] bg-cost-fuel" />
                <span className="w-[25%] bg-cost-toll" />
                <span className="w-[21%] bg-cost-parking" />
                <span className="w-[31%] bg-cost-admission" />
              </div>
              <dl className="mt-3 mb-0 grid grid-cols-2 gap-x-5 gap-y-1.5 text-xs">
                {[
                  ['燃料費', '¥2,600'],
                  ['高速', '¥2,800'],
                  ['駐車', '¥2,400'],
                  ['入場', '¥3,600'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-muted">{label}</dt>
                    <dd className="m-0 font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="mt-6 md:mt-6">
          <QuickStartForm />
          <p className="mt-3 mb-0 text-xs text-muted">
            ルートの確認はログイン不要。保存と共有はログイン後に使えます。高速・ETC・往復などの詳細は次の画面で設定します。
          </p>
        </section>

        {trips.length > 0 && (
          <section className="mt-6 md:hidden">
            <Link
              href={`/trips/${trips[0].id}`}
              prefetch={false}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3 text-ink no-underline"
            >
              <span className="h-14 w-14 shrink-0 rounded-xl bg-photo-1" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted">前回のプラン</span>
                <span className="block truncate text-[15px] font-semibold">
                  {trips[0].prefecture?.join('・')} · {formatJapaneseDate(trips[0].departure_date)}
                </span>
              </span>
            </Link>
          </section>
        )}

        <section className="mt-20 hidden md:block">
          <div className="flex items-end justify-between gap-8">
            <h2 className="m-0 text-[32px] leading-[1.35] font-bold">
              4つの費用を、
              <br />
              出発前にまとめて。
            </h2>
            <p className="m-0 max-w-[380px] text-sm leading-[1.8] text-ink-soft">
              ルートが変われば、費用も自動で計算し直します。立ち寄り先を入れ替えて、予算に合う回り方を探せます。
            </p>
          </div>
          <ol className="mt-8 grid list-none grid-cols-4 gap-8 border-t border-ink p-0 pt-6">
            {COST_ITEMS.map((item) => (
              <li key={item.no}>
                <p className="m-0 flex items-center gap-2 text-xs text-muted">
                  <span className={`h-2 w-2 rounded-full ${item.dot}`} aria-hidden />
                  {item.no}
                </p>
                <h3 className="mt-3 mb-2 text-lg font-bold">{item.title}</h3>
                <p className="m-0 text-[13px] leading-[1.8] text-ink-soft">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 hidden md:block">
          <div className="flex items-end justify-between">
            <h2 className="m-0 text-[30px] font-bold">行き先から考える</h2>
            <Link href="/plan/new?step=2" className="text-[13px] font-medium">
              エリアを選んで始める →
            </Link>
          </div>
          <ul className="mt-6 grid list-none grid-cols-4 gap-5 p-0">
            {AREAS.map((area) => (
              <li key={area.name}>
                <Link
                  href={`/plan/new?step=1&prefecture=${encodeURIComponent(area.prefecture)}`}
                  className="group block text-ink no-underline"
                >
                  <span
                    className={`block aspect-[4/5] rounded-2xl transition group-hover:opacity-90 ${area.color}`}
                    aria-hidden
                  />
                  <span className="mt-3 block text-lg font-bold">{area.name}</span>
                  <span className="block text-[13px] text-muted">{area.tags}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {trips.length > 0 && (
          <section className="mt-20 hidden md:block">
            <div className="flex items-end justify-between">
              <h2 className="m-0 text-2xl font-bold">マイプラン</h2>
              <Link href="/trips" prefetch={false} className="text-[13px] font-medium">
                すべて見る →
              </Link>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-5 py-3 font-normal">旅程</th>
                    <th className="px-5 py-3 font-normal">日程</th>
                    <th className="px-5 py-3 font-normal">人数</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr key={trip.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4 font-semibold">
                        {trip.origin} → {trip.prefecture?.join('・')}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">
                        {formatJapaneseDate(trip.departure_date)}・{formatTripLength(trip.days)}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{trip.people}人</td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/trips/${trip.id}`} prefetch={false}>
                          開く
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <footer className="hidden border-t border-line md:block">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-8 py-6 text-xs text-muted">
          <span>Carrip</span>
          <span>費用は目安です。実際の料金は現地でご確認ください。</span>
        </div>
      </footer>
    </AppShell>
  )
}
