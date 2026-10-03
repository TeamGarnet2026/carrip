'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { translateSupabaseError } from '@/utils/supabase/error-messages'

type AuthMode = 'login' | 'signup'

type AuthFormProps = {
  mode: AuthMode
  redirectTo: string
}

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()

    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (error) {
      setMessage(translateSupabaseError(error))
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-[13px] font-bold text-ink">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="carrip-field min-h-[48px] w-full rounded-xl border border-line px-4 py-2.5 text-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-neutral-300 focus:border-brand focus:ring-4 focus:ring-brand/15"
          style={{
            colorScheme: 'light',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            WebkitTextFillColor: '#0f172a',
          }}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-[13px] font-bold text-ink">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="carrip-field min-h-[48px] w-full rounded-xl border border-line px-4 py-2.5 text-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-neutral-300 focus:border-brand focus:ring-4 focus:ring-brand/15"
          style={{
            colorScheme: 'light',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            WebkitTextFillColor: '#0f172a',
          }}
        />
      </div>
      {message && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="min-h-[48px] rounded-xl bg-brand px-5 py-3 text-[15px] font-bold text-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,138,126,0.25)] transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 active:scale-[0.99] disabled:opacity-50"
      >
        {loading ? '処理中…' : isLogin ? 'ログイン' : '新規登録'}
      </button>
      <p className="text-center text-sm text-muted">
        {isLogin ? (
          <>
            アカウントをお持ちでない方は{' '}
            <Link
              href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="font-bold text-brand-dark underline-offset-4 hover:underline"
            >
              新規登録
            </Link>
          </>
        ) : (
          <>
            すでにアカウントがある方は{' '}
            <Link
              href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="font-bold text-brand-dark underline-offset-4 hover:underline"
            >
              ログイン
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
