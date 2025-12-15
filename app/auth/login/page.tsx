"use client"

import type React from "react"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertTriangle, Home } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const supabaseReady = isSupabaseConfigured()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()

    if (!supabase) {
      setError("Supabaseが設定されていません")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      // プロファイルが完成しているかチェック
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, company_id')
          .eq('user_id', user.id)
          .single()
        
        // プロファイルが未完成の場合（nameが'User'またはcompany_idが存在しない）はプロファイル登録画面へ
        if (!profile || !profile.name || profile.name === 'User' || !profile.company_id) {
          router.push("/auth/complete-profile")
          return
        }
      }
      
      router.push("/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full">
      {/* Left side - AI Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* AI Brain Network Pattern */}
            <circle cx="200" cy="150" r="80" fill="white" opacity="0.1" />
            <circle cx="600" cy="200" r="60" fill="white" opacity="0.1" />
            <circle cx="400" cy="400" r="70" fill="white" opacity="0.1" />
            <circle cx="150" cy="450" r="50" fill="white" opacity="0.1" />
            <circle cx="650" cy="450" r="65" fill="white" opacity="0.1" />
            
            {/* Connecting Lines */}
            <line x1="200" y1="150" x2="400" y2="400" stroke="white" strokeWidth="2" opacity="0.2" />
            <line x1="600" y1="200" x2="400" y2="400" stroke="white" strokeWidth="2" opacity="0.2" />
            <line x1="200" y1="150" x2="600" y2="200" stroke="white" strokeWidth="2" opacity="0.2" />
            <line x1="150" y1="450" x2="400" y2="400" stroke="white" strokeWidth="2" opacity="0.2" />
            <line x1="650" y1="450" x2="400" y2="400" stroke="white" strokeWidth="2" opacity="0.2" />
            
            {/* AI Robot Silhouette */}
            <rect x="350" y="250" width="100" height="120" rx="10" fill="white" opacity="0.15" />
            <circle cx="400" cy="280" r="20" fill="white" opacity="0.2" />
            <rect x="370" y="320" width="20" height="30" rx="5" fill="white" opacity="0.15" />
            <rect x="410" y="320" width="20" height="30" rx="5" fill="white" opacity="0.15" />
            <rect x="380" y="350" width="40" height="20" rx="5" fill="white" opacity="0.15" />
          </svg>
        </div>
        <div className="relative z-10 text-center px-12">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">AIの力で<br />経営を変革</h2>
            <p className="text-white/80 text-lg">24時間365日、AIがあなたのビジネスをサポートします</p>
          </div>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
        <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">

          {!supabaseReady && (
            <Card className="border-amber-200 bg-amber-50 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Supabase未設定</p>
                    <p className="text-sm text-amber-700 mt-1">
                      認証機能を使用するには、v0サイドバーの「Connect」からSupabaseを接続してください。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-2xl border border-gray-200 bg-white">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
              <CardDescription>アカウントにログインしてください</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={!supabaseReady}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">パスワード</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={!supabaseReady}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
                    disabled={isLoading || !supabaseReady}
                  >
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm text-gray-600">
                  アカウントをお持ちでないですか？{" "}
                  <Link
                    href="/auth/sign-up"
                    className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-4"
                  >
                    新規登録
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <Home size={18} />
              <span>トップページに戻る</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
