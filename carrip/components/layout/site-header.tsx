'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogoutButton } from '@/components/auth/logout-button'
import { ChevronLeftIcon, LogoMark } from '@/components/ui/icons'

type SiteHeaderProps = {
  email?: string | null
  showLogout?: boolean
}

export const PLAN_FLOW_STEPS = ['条件', '行き先', 'ルートと料金', '保存・共有'] as const

/** 旅程づくりの画面なら、何番目のステップかを返す（それ以外は null） */
export function planFlowStep(pathname: string): number | null {
  if (pathname.startsWith('/plan/new')) return 1
  if (/^\/plan\/[^/]+\/spots/.test(pathname)) return 2
  if (/^\/plan\/[^/]+\/routes/.test(pathname)) return 3
  if (/^\/plan\/[^/]+\/(confirmed|share)/.test(pathname)) return 4
  return null
}

const SITE_NAV = [
  {
    href: '/plan/new?step=1',
    label: 'プランを作る',
    match: (path: string) => path.startsWith('/plan'),
  },
  {
    href: '/trips',
    label: 'マイプラン',
    // ログイン画面は「マイプラン」から誘導されるため、同じ項目を選択中として表示する
    match: (path: string) =>
      path.startsWith('/trips') || path === '/login' || path === '/signup',
  },
]

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
    >
      <LogoMark />
      Carrip
    </Link>
  )
}

function AccountArea({ email, showLogout }: SiteHeaderProps) {
  if (email) {
    return (
      <div className="ml-auto flex items-center gap-4">
        <span className="hidden max-w-[220px] truncate text-[13px] text-muted sm:inline">
          {email}
        </span>
        {showLogout && <LogoutButton />}
      </div>
    )
  }
  return (
    <Link
      href="/login"
      className="ml-auto text-sm font-medium text-ink no-underline hover:text-brand"
    >
      ログイン
    </Link>
  )
}

export function SiteHeader({ email, showLogout }: SiteHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const step = planFlowStep(pathname)

  return (
    <header className="border-b border-line bg-bg">
      {/* PC: ロゴ + 進行状況（旅程づくり中）またはメニュー + アカウント */}
      <div className="hidden min-h-16 flex-wrap items-center gap-x-8 gap-y-3 px-8 md:flex">
        <Brand />
        {step != null ? (
          <ol
            aria-label="進行状況"
            className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[13px]"
          >
            {PLAN_FLOW_STEPS.map((label, index) => {
              const current = index + 1 === step
              return (
                <li
                  key={label}
                  aria-current={current ? 'step' : undefined}
                  className={
                    current
                      ? 'border-b-2 border-ink pb-0.5 font-semibold text-ink'
                      : 'pb-0.5 text-muted'
                  }
                >
                  {index + 1} {label}
                </li>
              )
            })}
          </ol>
        ) : (
          <nav aria-label="メインメニュー" className="flex gap-6 text-sm">
            {SITE_NAV.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={item.href === '/trips' ? false : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`pb-0.5 no-underline ${
                    active
                      ? 'border-b-2 border-ink font-semibold text-ink'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}
        <AccountArea email={email} showLogout={showLogout} />
      </div>

      {/* スマホ: 旅程づくり中は「戻る + ステップ」、それ以外はロゴ + ログイン */}
      <div className="flex min-h-14 items-center gap-3 px-5 md:hidden">
        {step != null ? (
          <>
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="戻る"
              className="-ml-2 grid h-10 w-10 place-items-center rounded-[10px] text-ink"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <span className="text-[15px] text-muted">
              ステップ {step} / {PLAN_FLOW_STEPS.length}
            </span>
          </>
        ) : (
          <>
            <Brand />
            <AccountArea email={email} showLogout={showLogout} />
          </>
        )}
      </div>
    </header>
  )
}
