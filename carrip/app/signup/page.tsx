import Link from 'next/link'
import { AuthForm } from '@/components/auth/auth-form'
import { AppShell } from '@/components/layout/app-shell'

export const runtime = 'edge'

type SignupPageProps = {
  searchParams: Promise<{ redirectTo?: string }>
}

function resolveRedirectTo(redirectTo?: string): string {
  if (redirectTo?.startsWith('/') && !redirectTo.startsWith('//')) {
    return redirectTo
  }
  return '/trips'
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const redirectTo = resolveRedirectTo(params.redirectTo)

  return (
    <AppShell variant="auth">
      <div className="grid gap-4">
        <h2 className="m-0 text-[28px] font-bold tracking-tight text-ink">新規登録</h2>
        <p className="m-0 text-[13px] leading-relaxed text-muted">
          幹事向けアカウントを作成します。
        </p>
        <AuthForm mode="signup" redirectTo={redirectTo} />
        <p className="text-sm">
          <Link href="/" className="font-bold text-muted transition hover:text-ink">
            トップへ戻る
          </Link>
        </p>
      </div>
    </AppShell>
  )
}
