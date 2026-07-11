import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">404</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          ページが見つかりません。URLが正しいか確認してください。
        </p>
        <Link href="/">
          <Button variant="secondary">トップへ戻る</Button>
        </Link>
      </main>
    </>
  )
}
