'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import AuthHeader from './AuthHeader'

export default function ConditionalHeader() {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/auth')
  
  if (isAuthPage) {
    return <AuthHeader />
  }
  
  return <Header />
}

