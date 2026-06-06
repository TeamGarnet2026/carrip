type SupabaseErrorLike = {
  message: string
  code?: string
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'メールアドレスまたはパスワードが正しくありません',
  email_not_confirmed: 'メールアドレスの確認が完了していません',
  user_already_exists: 'このメールアドレスはすでに登録されています',
  weak_password: 'パスワードは6文字以上で設定してください',
  invalid_email: 'メールアドレスの形式が正しくありません',
  email_address_invalid: 'メールアドレスの形式が正しくありません',
  over_request_rate_limit: 'リクエストが多すぎます。しばらく待ってから再度お試しください',
  too_many_requests: 'リクエストが多すぎます。しばらく待ってから再度お試しください',
  signup_disabled: '新規登録は現在受け付けていません',
  user_not_found: 'ユーザーが見つかりません',
  same_password: '新しいパスワードは現在のパスワードと異なる必要があります',
  session_not_found: 'セッションが見つかりません。再度ログインしてください',
  validation_failed: '入力内容に誤りがあります',
  otp_expired: '確認コードの有効期限が切れました',
  flow_state_expired: '認証の有効期限が切れました。最初からやり直してください',
  identity_already_exists: 'このアカウントはすでに連携されています',
  email_address_not_authorized: 'このメールアドレスは使用できません',
}

const MESSAGE_PATTERNS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'メールアドレスまたはパスワードが正しくありません'],
  [/user already registered/i, 'このメールアドレスはすでに登録されています'],
  [/password should be at least/i, 'パスワードは6文字以上で設定してください'],
  [/unable to validate email/i, 'メールアドレスの形式が正しくありません'],
  [/email rate limit exceeded/i, 'リクエストが多すぎます。しばらく待ってから再度お試しください'],
  [/email not confirmed/i, 'メールアドレスの確認が完了していません'],
  [/network request failed/i, 'ネットワークエラーが発生しました。接続を確認してください'],
  [/fetch failed/i, 'ネットワークエラーが発生しました。接続を確認してください'],
  [/relation .* does not exist/i, 'データが見つかりません。管理者にお問い合わせください'],
  [/permission denied/i, 'アクセス権限がありません'],
  [/jwt expired/i, 'ログインの有効期限が切れました。再度ログインしてください'],
]

export function translateSupabaseError(error: SupabaseErrorLike): string {
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code]
  }

  for (const [pattern, message] of MESSAGE_PATTERNS) {
    if (pattern.test(error.message)) {
      return message
    }
  }

  return 'エラーが発生しました。時間をおいて再度お試しください'
}
