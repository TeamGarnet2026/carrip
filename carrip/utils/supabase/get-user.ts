import type { AuthError, SupabaseClient, User } from '@supabase/supabase-js'

// auth-js は通信エラー時に最大30秒ほど再試行するため、待たずに未ログイン扱いで描画を続ける
const AUTH_TIMEOUT_MS = 3000

type GetUserResult = {
  data: { user: User | null }
  error: AuthError | Error | null
}

export async function getUserWithTimeout(
  supabase: Pick<SupabaseClient, 'auth'>,
  timeoutMs = AUTH_TIMEOUT_MS
): Promise<GetUserResult> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<GetUserResult>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`Supabase auth.getUser timed out after ${timeoutMs}ms`)
      resolve({
        data: { user: null },
        error: new Error('Supabase 認証の確認がタイムアウトしました'),
      })
    }, timeoutMs)
  })

  const request = supabase.auth
    .getUser()
    .then((result): GetUserResult => ({
      data: { user: result.data.user },
      error: result.error,
    }))
    .catch((error: unknown): GetUserResult => ({
      data: { user: null },
      error: error instanceof Error ? error : new Error(String(error)),
    }))

  try {
    return await Promise.race([request, timeout])
  } finally {
    clearTimeout(timer)
  }
}
