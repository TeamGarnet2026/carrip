import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'

const PHOTO =
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=70&w=1200'

export default function NotFound() {
  return (
    <AppShell>
      <div className="grid items-center gap-10 py-6 md:grid-cols-2 md:py-20">
        <div>
          <p className="m-0 text-[96px] leading-none font-bold tracking-[-0.05em] text-line-strong md:text-[120px]">
            404
          </p>
          <h1 className="mt-8 mb-0 text-[28px] leading-tight font-bold md:text-[34px]">
            道に迷ってしまったようです
          </h1>
          <p className="mt-5 mb-0 text-base text-ink-soft">
            ページが見つかりません。URLが正しいか確認してください。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/">
              <Button size="lg">トップへ戻る</Button>
            </Link>
            <Link href="/trips" prefetch={false}>
              <Button variant="secondary" size="lg">
                マイプラン
              </Button>
            </Link>
          </div>
        </div>
        <div className="carrip-photo hidden aspect-[4/3] bg-photo-2 md:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PHOTO} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
    </AppShell>
  )
}
