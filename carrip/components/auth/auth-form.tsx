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

  const fieldClass =
    'carrip-field min-h-[50px] w-full rounded-[10px] border border-line-strong px-3.5 text-base outline-none focus:border-ink focus:ring-1 focus:ring-ink'
  const fieldStyle = {
    colorScheme: 'light' as const,
    backgroundColor: '#ffffff',
    color: '#1b1d1c',
    WebkitTextFillColor: '#1b1d1c',
  }
  const otherHref = `${isLogin ? '/signup' : '/login'}?redirectTo=${encodeURIComponent(redirectTo)}`

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          style={fieldStyle}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold">
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
          className={fieldClass}
          style={fieldStyle}
        />
        {!isLogin && <p className="m-0 text-[13px] text-muted">6文字以上</p>}
      </div>
      {message && (
        <p
          className="m-0 rounded-[10px] bg-[#f6e4dd] px-4 py-3 text-sm font-medium text-[#8a3f27]"
          role="alert"
        >
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 min-h-[52px] rounded-[10px] bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
      >
        {loading ? '処理中…' : isLogin ? 'ログイン' : '新規登録'}
      </button>
      <p className="m-0 border-t border-sunken pt-[18px] text-sm text-neutral-600">
        {isLogin ? 'アカウントをお持ちでない方は ' : 'すでにアカウントがある方は '}
        <Link href={otherHref} className="font-semibold">
          {isLogin ? '新規登録' : 'ログイン'}
        </Link>
      </p>
    </form>
  )
}
