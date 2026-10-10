import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'

type AppShellVariant = 'app' | 'entry' | 'auth' | 'center'

type AppShellProps = {
  children: ReactNode
  title?: string
  subtitle?: string
  email?: string | null
  showLogout?: boolean
  variant?: AppShellVariant
  actions?: ReactNode
  authVisual?: ReactNode
}

export function AppShell({
  children,
  title,
  subtitle,
  email,
  showLogout = false,
  variant = 'app',
  actions,
  authVisual,
}: AppShellProps) {
  // どの画面もサイドバー付きの同じ枠に収め、画面遷移しても別アプリに見えないようにする
  let content: ReactNode = children

  if (variant === 'auth') {
    content = (
      <div className="carrip-auth-card">
        <div className="carrip-auth-visual">
          {authVisual ?? (
            <>
              <p className="carrip-glass m-0 w-fit rounded-full px-3 py-1 text-xs font-bold text-white/90">
                Carrip アカウント
              </p>
              <h2 className="m-0 text-[clamp(24px,2.6vw,32px)] leading-[1.3] font-bold tracking-tight">
                グループドライブ旅行を、
                <br />
                費用込みで計画
              </h2>
              <p className="m-0 text-sm leading-[1.9] text-white/80">
                行きたい場所を選ぶだけで、回る順番と燃料費・高速料金・駐車料・入場料を計算します。
              </p>
            </>
          )}
        </div>
        <div className="carrip-auth-panel">{children}</div>
      </div>
    )
  } else if (variant === 'center') {
    content = <div className="mx-auto w-full max-w-lg pt-6 sm:pt-12">{children}</div>
  }

  return (
    <div className="carrip-app">
      <AppSidebar email={email} showLogout={showLogout} />
      <div className="carrip-main">
        {(title || subtitle || actions) && (
          <header className="carrip-topbar">
            <div>
              {title && (
                <h1 className="m-0 text-[22px] leading-tight font-bold tracking-tight text-ink">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 mb-0 text-[13px] leading-normal text-muted">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
        )}
        <main className="carrip-workspace">{content}</main>
      </div>
    </div>
  )
}
