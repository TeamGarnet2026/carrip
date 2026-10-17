import { AuthForm } from '@/components/auth/auth-form'
import { AppShell } from '@/components/layout/app-shell'

export const runtime = 'edge'

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
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[26px] font-bold">ログイン</h1>
        <p className="m-0 text-sm leading-[1.8] text-muted">プランの保存と共有にはログインが必要です。</p>
      </div>
      <AuthForm mode="login" redirectTo={redirectTo} />
    </AppShell>
  )
}
