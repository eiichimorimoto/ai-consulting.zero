"use client"

import Link from "next/link"
import { Home } from "lucide-react"

export default function AuthHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-white/70 shadow-sm backdrop-blur-2xl">
      <div className="w-full" style={{ paddingLeft: "19px", paddingRight: "19px" }}>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="SolveWise"
              width={40}
              height={40}
              className="h-10 w-auto object-contain"
            />
            <div>
              <span className="text-lg font-bold text-gray-900">SolveWise</span>
              <p className="hidden text-xs text-gray-600 sm:block">経営課題をAIで解決</p>
            </div>
          </Link>

          <a
            href="/"
            className="flex cursor-pointer flex-col items-center gap-0.5 text-gray-600 transition-colors hover:text-blue-600"
          >
            <Home size={18} />
            <span className="text-xs">TOP</span>
          </a>
        </div>
      </div>
    </header>
  )
}
