import { getGeminiApiKey, isGeminiConfigured } from '@/lib/google/config'

export type GeminiHealthReason =
  | 'ok'
  | 'not_configured'
  | 'quota_exceeded'
  | 'auth_error'
  | 'api_error'

export type GeminiHealthCheck = {
  ok: boolean
  configured: boolean
  reason: GeminiHealthReason
  model: string
  message: string
  http_status?: number
  error_code?: string
  fix_steps: string[]
  sample_response?: string
}

type GeminiProbeResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
  }>
  error?: {
    message?: string
    status?: string
    code?: number
  }
}

export async function checkGeminiHealth(): Promise<GeminiHealthCheck> {
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite'

  if (!isGeminiConfigured()) {
    return {
      ok: false,
      configured: false,
      reason: 'not_configured',
      model,
      message: 'GEMINI_API_KEY が未設定です',
      fix_steps: [
        '.env.local に GEMINI_API_KEY を設定してください',
        'Google AI Studio (https://aistudio.google.com/apikey) で API キーを取得',
        '設定後は npm run dev を再起動してください',
      ],
    }
  }

  const apiKey = getGeminiApiKey()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with exactly: ok' }] }],
        generationConfig: { maxOutputTokens: 16, temperature: 0 },
      }),
      cache: 'no-store',
    }
  )

  const data = (await response.json()) as GeminiProbeResponse
  const sampleText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (response.ok && sampleText) {
    return {
      ok: true,
      configured: true,
      reason: 'ok',
      model,
      message: 'Gemini API は正常に応答しました',
      http_status: response.status,
      sample_response: sampleText.slice(0, 100),
      fix_steps: [],
    }
  }

  const errorMessage =
    data.error?.message ?? `Gemini API エラー (HTTP ${response.status})`
  const fixSteps: string[] = []

  if (response.status === 429 || errorMessage.includes('quota')) {
    fixSteps.push(
      '無料枠の上限に達しています。https://ai.dev/rate-limit で利用量を確認',
      '数分〜24時間待ってから再試行する',
      '.env.local に GEMINI_MODEL=gemini-3.1-flash-lite など無料枠のあるモデルを設定',
      'Google AI Studio で新しい API キー（AIza... 形式）を発行する',
      '必要なら Google Cloud で課金を有効化する'
    )
    return {
      ok: false,
      configured: true,
      reason: 'quota_exceeded',
      model,
      message:
        'API キーは Google に届いていますが、無料枠のクォータ上限に達しています',
      http_status: response.status,
      error_code: data.error?.status,
      fix_steps: fixSteps,
    }
  }

  if (response.status === 400 || response.status === 403) {
    fixSteps.push(
      'API キーが無効、または Generative Language API が有効化されていません',
      'Google AI Studio で新しい API キーを発行してください',
      'キー形式は通常 AIza... です（プロジェクトのキー制限も確認）'
    )
    return {
      ok: false,
      configured: true,
      reason: 'auth_error',
      model,
      message: errorMessage.split('\n')[0],
      http_status: response.status,
      error_code: data.error?.status,
      fix_steps: fixSteps,
    }
  }

  fixSteps.push('GEMINI_API_KEY と GEMINI_MODEL を確認してください')

  return {
    ok: false,
    configured: true,
    reason: 'api_error',
    model,
    message: errorMessage.split('\n')[0],
    http_status: response.status,
    error_code: data.error?.status,
    fix_steps: fixSteps,
  }
}
