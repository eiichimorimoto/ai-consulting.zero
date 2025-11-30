import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Consulting - AIがあなたの経営パートナーに',
  description: '24時間365日、経営課題についてAIに相談できます。名刺スキャンで簡単登録、企業情報も自動取得。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  )
}
