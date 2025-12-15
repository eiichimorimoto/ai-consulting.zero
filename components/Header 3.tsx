import Link from "next/link"
import { Button } from "@/components/ui/button"

const isSupabaseConfigured =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <img 
              src="/info-data/AI-LOGO001.png" 
              alt="SolveWise" 
              className="h-12 w-auto"
            />
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SolveWise
              </span>
              <p className="text-xs hidden sm:block text-gray-600">
                経営課題をAIで解決
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              機能
            </Link>
            <Link href="#process" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              導入の流れ
            </Link>
            <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              料金プラン
            </Link>
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              ログイン
            </Link>
          </nav>

          <Link href="/auth/sign-up">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm">
              無料で始める
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
