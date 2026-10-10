'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType, SVGProps } from 'react'
import { planFlowStep } from '@/components/layout/site-header'
import { BookmarkIcon, HomeIcon, PlusCircleIcon } from '@/components/ui/icons'

const TABS: Array<{
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  match: (path: string) => boolean
}> = [
  { href: '/', label: 'ホーム', icon: HomeIcon, match: (path) => path === '/' },
  {
    href: '/plan/new?step=1',
    label: '作る',
    icon: PlusCircleIcon,
    match: (path) => path.startsWith('/plan'),
  },
  {
    href: '/trips',
    label: 'マイプラン',
    icon: BookmarkIcon,
    match: (path) =>
      path.startsWith('/trips') || path === '/login' || path === '/signup',
  },
]

/** スマホ画面下のタブ。旅程づくりの途中は下部に操作ボタンを置くため表示しない */
export function MobileTabBar() {
  const pathname = usePathname()
  if (planFlowStep(pathname) != null) return null

  return (
    <nav
      aria-label="メインメニュー"
      className="sticky bottom-0 z-30 grid grid-cols-3 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={tab.href === '/trips' ? false : undefined}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[12px] no-underline ${
              active ? 'font-semibold text-ink' : 'text-muted'
            }`}
          >
            <Icon className="h-6 w-6" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
