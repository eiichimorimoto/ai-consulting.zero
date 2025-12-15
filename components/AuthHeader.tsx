'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'

export default function AuthHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto" style={{ paddingLeft: '19px', paddingRight: '19px' }}>
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <img 
              src="/info-data/AI-LOGO001.png" 
              alt="SolveWise" 
              className="h-12 w-auto"
            />
            <div>
              <span className="text-xl font-bold text-gray-900">
                SolveWise
              </span>
              <p className="text-xs hidden sm:block text-gray-600">
                経営課題をAIで解決
              </p>
            </div>
          </Link>
          
          <Link 
            href="/" 
            className="flex flex-col items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Home size={20} />
            <span className="text-xs">TOP</span>
          </Link>
        </div>
      </div>
    </header>
  )
}




