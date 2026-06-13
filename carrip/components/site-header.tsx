import Link from 'next/link'
import { LogoutButton } from '@/components/auth/logout-button'

type SiteHeaderProps = {
  email?: string | null
  showLogout?: boolean
}

export function SiteHeader({ email, showLogout = false }: SiteHeaderProps) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Carrip
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/trips" className="hover:underline">
            マイプラン
          </Link>
          {showLogout && (
            <>
              {email && (
                <span className="hidden text-neutral-600 sm:inline dark:text-neutral-400">
                  {email}
                </span>
              )}
              <LogoutButton />
            </>
          )}
          {!showLogout && (
            <Link href="/login" className="hover:underline">
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
