export function isGoogleCloudConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLOUD_API_KEY)
}

export function getGoogleCloudApiKey(): string {
  const key = process.env.GOOGLE_CLOUD_API_KEY
  if (!key) {
    throw new Error('GOOGLE_CLOUD_API_KEY が未設定です')
  }
  return key
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY)
}

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error('GEMINI_API_KEY が未設定です')
  }
  return key
}
