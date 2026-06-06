/**
 * ブラウザ上の Google マップ表示用 API キー。
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が未設定の場合は
 * next.config.ts 経由で GOOGLE_CLOUD_API_KEY が注入される。
 */
export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
}

export function isGoogleMapsConfigured(): boolean {
  return getGoogleMapsApiKey().length > 0
}
