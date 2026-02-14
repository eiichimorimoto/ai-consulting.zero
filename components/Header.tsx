"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

const isSupabaseConfigured =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/20 bg-white/70 shadow-sm backdrop-blur-2xl">
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

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/#features"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              機能
            </Link>
            <Link
              href="/#steps"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              5つのステップ
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              料金プラン
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              ログイン
            </Link>
          </nav>

          <Link href="/auth/sign-up">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-sm text-white hover:from-blue-600 hover:to-indigo-700">
              無料で始める
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
