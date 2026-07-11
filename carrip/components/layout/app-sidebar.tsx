'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/auth/logout-button'

type AppSidebarProps = {
  email?: string | null
  showLogout?: boolean
}

const NAV_ITEMS = [
  { href: '/', label: 'ホーム', icon: '⌂', match: (path: string) => path === '/' },
  {
    href: '/plan/new?step=1',
    label: '条件入力',
    icon: '✎',
    match: (path: string) => path.startsWith('/plan/new') || path.startsWith('/plan/generating'),
  },
  {
    href: '/trips',
    label: '保存済み',
    icon: '▣',
    match: (path: string) => path.startsWith('/trips'),
  },
]

export function AppSidebar({ email, showLogout }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="carrip-sidebar">
      <Link href="/" className="carrip-brand">
        <span className="carrip-brand-mark" aria-hidden>
          🚗
        </span>
        <span>Carrip</span>
      </Link>

      <nav className="carrip-nav" aria-label="メインナビゲーション">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`carrip-nav-link${active ? ' active' : ''}`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="carrip-trip-note">
        <b>Carrip 旅行計画</b>
        {email ? (
          <span>{email}</span>
        ) : (
          <span>ログインするとプランを保存・共有できます</span>
        )}
        {showLogout && (
          <div className="mt-3">
            <LogoutButton />
          </div>
        )}
      </div>
    </aside>
  )
}
