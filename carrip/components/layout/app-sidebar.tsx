'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType, SVGProps } from 'react'
import { LogoutButton } from '@/components/auth/logout-button'
import {
  BookmarkIcon,
  CarIcon,
  HomeIcon,
  RouteIcon,
} from '@/components/ui/icons'

type AppSidebarProps = {
  email?: string | null
  showLogout?: boolean
}

const NAV_ITEMS: Array<{
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  match: (path: string) => boolean
  prefetch?: boolean
}> = [
  { href: '/', label: 'ホーム', icon: HomeIcon, match: (path) => path === '/' },
  {
    href: '/plan/new?step=1',
    label: '条件入力',
    icon: RouteIcon,
    match: (path) =>
      path.startsWith('/plan/new') || /^\/plan\/[^/]+\/spots/.test(path),
  },
  {
    href: '/trips',
    label: '保存済み',
    icon: BookmarkIcon,
    match: (path) => path.startsWith('/trips'),
    prefetch: false,
  },
]

export function AppSidebar({ email, showLogout }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="carrip-sidebar">
      <Link href="/" className="carrip-brand">
        <span className="carrip-brand-mark" aria-hidden>
          <CarIcon />
        </span>
        <span>Carrip</span>
      </Link>

      <nav className="carrip-nav" aria-label="メインナビゲーション">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch}
              aria-current={active ? 'page' : undefined}
              className={`carrip-nav-link${active ? ' active' : ''}`}
            >
              <Icon />
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
