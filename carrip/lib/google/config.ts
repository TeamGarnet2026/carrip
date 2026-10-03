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
