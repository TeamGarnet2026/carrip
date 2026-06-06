import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    // マップ表示用。専用キーがなければ GOOGLE_CLOUD_API_KEY を流用する
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
      process.env.GOOGLE_CLOUD_API_KEY ??
      '',
  },
}

export default nextConfig
