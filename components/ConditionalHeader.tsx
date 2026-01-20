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
  const isConsultingPage = pathname?.startsWith('/consulting')
  const isDiagnosisPage = pathname?.startsWith('/diagnosis')
  const isLandingPage = pathname === '/'
  
  // ダッシュボードメイン（/dashboard）は独自のサイドバーがあるためヘッダー不要
  if (pathname === '/dashboard') {
    return null
  }
  
  // ダッシュボード配下、相談、診断ページではAppHeaderを表示
  if (isDashboardPage || isConsultingPage || isDiagnosisPage) {
    return <AppHeader />
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

