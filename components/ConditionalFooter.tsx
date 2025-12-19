'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './footer'

// ログイン後のページ用の細いフッター（copyrightのみ）
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
  const isAuthPage = pathname?.startsWith('/auth')
  const isDashboardPage = pathname?.startsWith('/dashboard')
  
  // ログイン後のページ（ダッシュボード、プロフィール登録完了後など）では細いフッターを表示
  if (isDashboardPage || (isAuthPage && pathname === '/auth/complete-profile')) {
    return <MinimalFooter />
  }
  
  // その他のページ（LP、認証ページなど）では通常のフッターを表示
  return <Footer />
}

