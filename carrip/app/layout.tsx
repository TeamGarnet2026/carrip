import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Carrip',
  description: 'ドライブ旅行向けの観光ルート・費用提案',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
