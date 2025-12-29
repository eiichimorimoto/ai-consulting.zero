'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './footer'
import Image from 'next/image'
import Link from 'next/link'

// アプリ部分用のフッター（ロゴ + コピーライト）
function AppFooter() {
  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* ロゴ */}
          <Link href="/dashboard" className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <Image
              src="/info-data/AI-LOGO001.png"
              alt="SolveWise"
              width={24}
              height={24}
              className="h-6 w-auto"
            />
            <span className="text-sm font-medium text-gray-600">SolveWise</span>
          </Link>
          
          {/* コピーライト */}
          <p className="text-xs text-gray-500">
            © 2025 SolveWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function ConditionalFooter() {
  const pathname = usePathname()
  
  // ダッシュボードメインページはサイドバーがあるためフッター不要
  if (pathname === '/dashboard') {
    return null
  }
  
  // LP部分（トップページ、料金、お問い合わせ、法的ページなど）
  const isLPPage = 
    pathname === '/' ||
    pathname === '/pricing' ||
    pathname === '/contact' ||
    pathname?.startsWith('/legal')
  
  // LP部分では通常のフッター（リンク付き）を表示
  if (isLPPage) {
    return <Footer />
  }
  
  // アプリ部分（ダッシュボード配下、診断、認証関連など）ではアプリ用フッター
  return <AppFooter />
}


