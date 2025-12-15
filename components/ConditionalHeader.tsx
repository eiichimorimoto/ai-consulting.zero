'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import AuthHeader from './AuthHeader'

export default function ConditionalHeader() {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/auth')
  const isDashboardPage = pathname?.startsWith('/dashboard')
  
  // ダッシュボード以下のアプリ側では独自のヘッダーを使用するため、LPのヘッダーは表示しない
  if (isDashboardPage) {
    return null
  }
  
  if (isAuthPage) {
    return <AuthHeader />
  }
  
  return <Header />
}

