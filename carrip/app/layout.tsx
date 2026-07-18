import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Carrip',
  description: 'ドライブ旅行向けの観光ルート・費用提案',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#eef3f4',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="h-full" style={{ colorScheme: 'light' }}>
      <body className="min-h-full bg-bg text-ink" style={{ colorScheme: 'light' }}>
        {children}
      </body>
    </html>
  )
}
