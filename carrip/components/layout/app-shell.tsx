import Link from 'next/link'
import type { ReactNode } from 'react'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SiteHeader } from '@/components/layout/site-header'

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
  // ログイン・新規登録（PC_14）: 共通ヘッダーの下に「写真 + フォーム」のカード
  if (variant === 'auth') {
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader email={email} showLogout={showLogout} />
        <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-4 px-5 pt-8 pb-16 md:px-8 md:pt-14 md:pb-20">
          <div className="flex flex-wrap overflow-hidden rounded-[18px] border border-line bg-surface">
            <div className="relative hidden min-h-[520px] flex-[1_1_380px] bg-photo-3 md:block">
              {authVisual ?? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={AUTH_PHOTO} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
            </div>
            <div className="flex flex-[1_1_380px] flex-col justify-center gap-5 px-6 py-10 md:px-11 md:py-12">
              {children}
            </div>
          </div>
          <p className="mx-1 my-0 text-[13px] text-muted">
            ルートの確認だけならログインは不要です。
            <Link href="/" className="font-medium">
              トップへ戻る
            </Link>
          </p>
        </main>
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
