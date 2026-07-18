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
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-line bg-[#fbfcfd] px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
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
          className="w-full rounded border border-line bg-[#fbfcfd] px-3 py-2 text-sm text-ink"
        />
      </div>
      {message && (
        <p className="text-sm text-red-600" role="alert">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? '処理中…' : isLogin ? 'ログイン' : '新規登録'}
      </button>
      <p className="text-center text-sm text-muted">
        {isLogin ? (
          <>
            アカウントをお持ちでない方は{' '}
            <Link
              href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="underline"
            >
              新規登録
            </Link>
          </>
        ) : (
          <>
            すでにアカウントがある方は{' '}
            <Link
              href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="underline"
            >
              ログイン
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
