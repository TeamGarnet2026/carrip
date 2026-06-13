import Link from 'next/link'
import { AuthForm } from '@/components/auth/auth-form'
import { SiteHeader } from '@/components/site-header'

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
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-6 py-12">
        <h1 className="mb-2 text-2xl font-bold">新規登録</h1>
        <p className="mb-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
          幹事向けアカウントを作成します。
        </p>
        <AuthForm mode="signup" redirectTo={redirectTo} />
        <p className="mt-8 text-sm">
          <Link href="/" className="text-neutral-600 underline dark:text-neutral-400">
            トップへ戻る
          </Link>
        </p>
      </main>
    </>
  )
}
