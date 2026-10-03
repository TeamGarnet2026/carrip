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
  if (variant === 'entry') {
    return <div className="carrip-entry-screen">{children}</div>
  }

  if (variant === 'auth') {
    return (
      <div className="carrip-auth-screen">
        <div className="carrip-auth-visual">
          {authVisual ?? (
            <>
              <h1 className="m-0 max-w-[650px] text-[clamp(34px,5vw,56px)] leading-[1.15] font-bold tracking-tight">
                グループドライブ旅行を、費用込みで計画
              </h1>
              <p className="m-0 max-w-[560px] text-base leading-[1.9] text-white/80">
                行きたい場所を選ぶだけで、回る順番と燃料費・高速料金・駐車料・入場料を計算します。
              </p>
            </>
          )}
        </div>
        <div className="carrip-auth-panel">{children}</div>
      </div>
    )
  }

  if (variant === 'center') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    )
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
        <div className="carrip-workspace">{children}</div>
      </div>
    </div>
  )
}
