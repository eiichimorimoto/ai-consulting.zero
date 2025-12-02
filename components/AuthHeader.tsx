'use client'

import Link from 'next/link'
import { Brain } from 'lucide-react'

export default function AuthHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
              <Brain size={28} />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI Consulting
              </span>
              <p className="text-xs hidden sm:block text-gray-600">
                経営課題をAIで解決
              </p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}

