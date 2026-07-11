import Link from 'next/link'
import { AuthForm } from '@/components/auth/auth-form'
import { AppShell } from '@/components/layout/app-shell'

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string }>
}

function resolveRedirectTo(redirectTo?: string): string {
  if (redirectTo?.startsWith('/') && !redirectTo.startsWith('//')) {
    return redirectTo
  }
  return '/trips'
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const redirectTo = resolveRedirectTo(params.redirectTo)

  return (
    <AppShell variant="auth">
      <div className="grid gap-4">
        <h2 className="m-0 text-[25px] font-black text-ink">ログイン</h2>
        <p className="m-0 text-[13px] leading-relaxed text-muted">
          プランの保存やマイページ利用にはログインが必要です。
        </p>
        <AuthForm mode="login" redirectTo={redirectTo} />
        <p className="text-sm">
          <Link href="/" className="font-extrabold text-brand-dark underline">
            トップへ戻る
          </Link>
        </p>
      </div>
    </AppShell>
  )
}
