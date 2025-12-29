'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './footer'

// アプリ部分用のシンプルフッター（コピーライトのみ）
function MinimalFooter() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <p className="text-xs text-gray-500 text-center">
          © 2025 SolveWise. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default function ConditionalFooter() {
  const pathname = usePathname()
  
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
  
  // アプリ部分（登録以降: ダッシュボード、診断、認証関連など）ではシンプルフッター
  return <MinimalFooter />
}


