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
    match: (path: string) => path.startsWith('/trips'),
  },
]

function Brand({ large = false }: { large?: boolean }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2.5 font-semibold tracking-[-0.02em] text-ink no-underline ${
        large ? 'text-xl' : 'text-[19px]'
      }`}
    >
      <LogoMark size={large ? 26 : 24} />
      Carrip
    </Link>
  )
}

function AccountArea({ email, showLogout, pathname }: SiteHeaderProps & { pathname: string }) {
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
  // ログイン画面では新規登録へ、新規登録画面ではログインへのボタンを出す
  if (pathname === '/login' || pathname === '/signup') {
    const toSignup = pathname === '/login'
    return (
      <Link
        href={toSignup ? '/signup' : '/login'}
        className="ml-auto inline-flex min-h-10 items-center rounded-[10px] border border-line-strong bg-surface px-[18px] text-sm font-medium text-ink no-underline hover:bg-soft"
      >
        {toSignup ? '新規登録' : 'ログイン'}
      </Link>
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
      <div
        className={`hidden flex-wrap items-center gap-y-3 px-8 md:flex ${
          step != null ? 'min-h-16 gap-x-8' : 'mx-auto min-h-[68px] max-w-[1240px] gap-x-10'
        }`}
      >
        <Brand large={step == null} />
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
          <nav aria-label="メインメニュー" className="flex gap-7 text-sm font-medium">
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
        <AccountArea email={email} showLogout={showLogout} pathname={pathname} />
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
            <AccountArea email={email} showLogout={showLogout} pathname={pathname} />
          </>
        )}
      </div>
    </header>
  )
}
