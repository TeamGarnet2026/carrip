import Link from 'next/link'
import type { ReactNode } from 'react'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SiteHeader } from '@/components/layout/site-header'
import { LogoMark } from '@/components/ui/icons'

type AppShellVariant = 'app' | 'entry' | 'auth' | 'center'

type AppShellProps = {
  children: ReactNode
  title?: string
  subtitle?: string
  /** タイトルの上に出す小さな補足（例: 京都駅 出発 · 11月3日（火）· 4人） */
  eyebrow?: string
  email?: string | null
  showLogout?: boolean
  variant?: AppShellVariant
  actions?: ReactNode
  authVisual?: ReactNode
}

const AUTH_PHOTO =
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=70&w=1200'

export function AppShell({
  children,
  title,
  subtitle,
  eyebrow,
  email,
  showLogout = false,
  variant = 'app',
  actions,
  authVisual,
}: AppShellProps) {
  // ログイン・新規登録は左に写真、右にフォームの全画面レイアウト
  if (variant === 'auth') {
    return (
      <div className="grid min-h-dvh bg-bg md:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-photo-3 md:block">
          {authVisual ?? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={AUTH_PHOTO}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <Link
            href="/"
            className="absolute top-7 left-8 flex items-center gap-2.5 rounded-[10px] bg-bg/90 px-3 py-2 text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <LogoMark />
            Carrip
          </Link>
        </div>
        <div className="flex flex-col">
          <div className="flex min-h-14 items-center px-5 md:hidden">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-[19px] font-semibold text-ink no-underline"
            >
              <LogoMark />
              Carrip
            </Link>
          </div>
          <main className="flex flex-1 items-center justify-center px-5 py-10 md:px-10">
            <div className="w-full max-w-[380px]">{children}</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader email={email} showLogout={showLogout} />
      <main className="flex-1">
        {variant === 'entry' ? (
          children
        ) : variant === 'center' ? (
          <div className="carrip-container flex justify-center">
            <div className="w-full max-w-lg pt-6 md:pt-16">{children}</div>
          </div>
        ) : (
          <div className="carrip-container flex flex-col gap-7">
            {(title || subtitle || eyebrow || actions) && (
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                  {eyebrow && <p className="m-0 text-[13px] text-muted">{eyebrow}</p>}
                  {title && (
                    <h1 className="m-0 text-[26px] leading-tight font-bold md:text-[32px]">
                      {title}
                    </h1>
                  )}
                  {subtitle && <p className="m-0 text-sm text-muted">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
              </div>
            )}
            {children}
          </div>
        )}
      </main>
      <MobileTabBar />
    </div>
  )
}
