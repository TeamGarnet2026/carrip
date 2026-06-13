import Link from 'next/link'
import { AuthForm } from '@/components/auth/auth-form'
import { SiteHeader } from '@/components/site-header'

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
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-6 py-12">
        <h1 className="mb-2 text-2xl font-bold">ログイン</h1>
        <p className="mb-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
          プランの保存やマイページ利用にはログインが必要です。
          <br />
          ルート候補の閲覧はログインなしで利用できます。
        </p>
        <AuthForm mode="login" redirectTo={redirectTo} />
        <p className="mt-8 text-sm">
          <Link href="/" className="text-neutral-600 underline dark:text-neutral-400">
            トップへ戻る
          </Link>
        </p>
      </main>
    </>
  )
}
