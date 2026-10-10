import type { Metadata, Viewport } from 'next'
import { Geist, Noto_Sans_JP } from 'next/font/google'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

// 日本語フォントはサイズが大きいため事前読み込みせず、使う文字の分だけ読み込む
const notoSansJp = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Carrip',
  description: 'グループドライブの行き先・回る順番・費用（燃料・高速・駐車・入場）をまとめて計画',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f3f3f0',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ja"
      className={`h-full ${geist.variable} ${notoSansJp.variable}`}
      style={{ colorScheme: 'light' }}
    >
      <body className="min-h-full bg-bg text-ink" style={{ colorScheme: 'light' }}>
        {children}
      </body>
    </html>
  )
}
