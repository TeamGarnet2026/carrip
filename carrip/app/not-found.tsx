import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <AppShell variant="center">
      <div className="carrip-panel p-8 text-center">
        <h1 className="text-2xl font-black text-ink">404</h1>
        <p className="mt-3 text-muted">
          ページが見つかりません。URLが正しいか確認してください。
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="secondary">トップへ戻る</Button>
        </Link>
      </div>
    </AppShell>
  )
}
