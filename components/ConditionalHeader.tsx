'use client'

import { usePathname } from 'next/navigation'
import { Header } from './Header'
import AuthHeader from './AuthHeader'
import LandingHeader from './LandingHeader'
import AppHeader from './AppHeader'

export default function ConditionalHeader() {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/auth')
  const isDashboardPage = pathname?.startsWith('/dashboard')
  const isLandingPage = pathname === '/'
  const isDiagnosisPage = pathname?.startsWith('/diagnosis')
  
  // ダッシュボードメイン（/dashboard）は独自のサイドバーがあるためヘッダー不要
  if (pathname === '/dashboard') {
    return null
  }
  
  // ダッシュボード配下のサブページ（settings, website-analysis等）ではAppHeaderを表示
  if (isDashboardPage) {
    return <AppHeader />
  }
  
  // 診断ページは独自のヘッダーを使用するためnullを返す
  if (isDiagnosisPage) {
    return null
  }
  
  if (isAuthPage) {
    return <AuthHeader />
  }
  
  // トップページではClaudeDesign1220のLandingHeaderを使用
  if (isLandingPage) {
    return <LandingHeader />
  }
  
  return <Header />
}

