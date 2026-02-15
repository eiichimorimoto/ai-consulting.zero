"use client"

import type React from "react"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useRef, useCallback } from "react"
import { AlertTriangle, Home } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null)
  const [adminMode, setAdminMode] = useState(false)
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const supabaseReady = isSupabaseConfigured()

  // 隠し管理者モード: AIアイコンを素早く5回クリックで有効化
  const handleSecretClick = useCallback(() => {
    clickCountRef.current += 1
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    if (clickCountRef.current >= 5) {
      setAdminMode(true)
      clickCountRef.current = 0
      return
    }
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 3000)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()

    if (!supabase) {
      setError("Supabaseが設定されていません")
      return
    }

    setIsLoading(true)
    setError(null)
    setLoadingMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      setError(null)
      setLoadingMessage("ログインしました。リダイレクト中...")

      // 管理者モードの場合は直接 /admin へ
      let redirectPath = adminMode ? "/admin" : "/dashboard"

      // 通常モード時のみプロファイル完成チェック
      if (!adminMode) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name, company_id")
              .eq("user_id", user.id)
              .single()

            // プロファイルが未完成の場合はプロファイル登録画面へ
            if (!profile || !profile.name || profile.name === "User" || !profile.company_id) {
              redirectPath = "/auth/complete-profile"
            }
          }
        } catch {
          // プロファイル取得失敗時はダッシュボードへ（未完成ならそこでリダイレクトされる）
          redirectPath = "/dashboard"
        }
      }

      // クライアントナビゲーションを試す
      router.push(redirectPath)
      // Vercel等で router.push が効かない場合の対策: 2秒後もログイン画面にいたらフルリロードで遷移
      const fallbackTimer = window.setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname === "/auth/login") {
          window.location.href = redirectPath
        }
      }, 2000)
      const unsub = () => {
        window.clearTimeout(fallbackTimer)
        window.removeEventListener("beforeunload", unsub)
      }
      window.addEventListener("beforeunload", unsub)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full">
      {/* Left side - AI Illustration */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 lg:flex lg:w-1/2">
        {/* Quantum Computer Background Image */}
        <div className="absolute inset-0 opacity-30">
          <img
            src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop"
            alt="Quantum Computer"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-blue-500/70 to-indigo-600/80"></div>
        <div className="absolute inset-0 opacity-20">
          <svg
            className="h-full w-full"
            viewBox="0 0 800 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* AI Brain Network Pattern */}
            <circle cx="200" cy="150" r="80" fill="white" opacity="0.1" />
            <circle cx="600" cy="200" r="60" fill="white" opacity="0.1" />
            <circle cx="400" cy="400" r="70" fill="white" opacity="0.1" />
            <circle cx="150" cy="450" r="50" fill="white" opacity="0.1" />
            <circle cx="650" cy="450" r="65" fill="white" opacity="0.1" />

            {/* Connecting Lines */}
            <line
              x1="200"
              y1="150"
              x2="400"
              y2="400"
              stroke="white"
              strokeWidth="2"
              opacity="0.2"
            />
            <line
              x1="600"
              y1="200"
              x2="400"
              y2="400"
              stroke="white"
              strokeWidth="2"
              opacity="0.2"
            />
            <line
              x1="200"
              y1="150"
              x2="600"
              y2="200"
              stroke="white"
              strokeWidth="2"
              opacity="0.2"
            />
            <line
              x1="150"
              y1="450"
              x2="400"
              y2="400"
              stroke="white"
              strokeWidth="2"
              opacity="0.2"
            />
            <line
              x1="650"
              y1="450"
              x2="400"
              y2="400"
              stroke="white"
              strokeWidth="2"
              opacity="0.2"
            />

            {/* AI Robot Silhouette */}
            <rect x="350" y="250" width="100" height="120" rx="10" fill="white" opacity="0.15" />
            <circle cx="400" cy="280" r="20" fill="white" opacity="0.2" />
            <rect x="370" y="320" width="20" height="30" rx="5" fill="white" opacity="0.15" />
            <rect x="410" y="320" width="20" height="30" rx="5" fill="white" opacity="0.15" />
            <rect x="380" y="350" width="40" height="20" rx="5" fill="white" opacity="0.15" />
          </svg>
        </div>
        <div className="relative z-10 px-12 text-center">
          <div className="mb-8">
            <div
              onClick={handleSecretClick}
              className={`mx-auto mb-6 flex h-32 w-32 cursor-default items-center justify-center rounded-full backdrop-blur-md transition-all duration-500 ${
                adminMode
                  ? "animate-pulse bg-amber-400/30 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                  : "animate-bounce bg-white/20"
              }`}>
              <svg
                className="h-20 w-20 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h2 className="mb-4 text-4xl font-bold text-white">
              AIの力で
              <br />
              経営を変革
            </h2>
            <p className="text-lg text-white/90">
              24時間365日、AIがあなたのビジネスをサポートします
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-6 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 md:p-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            {!supabaseReady && (
              <Card className="border-amber-200 bg-amber-50 shadow-md dark:border-amber-800 dark:bg-amber-950">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Supabase未設定</p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                        認証機能を使用するには、v0サイドバーの「Connect」からSupabaseを接続してください。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border border-gray-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold dark:text-zinc-100">ログイン</CardTitle>
                <CardDescription className="dark:text-zinc-400">アカウントにログインしてください</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin}>
                  <div className="flex flex-col gap-5">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="dark:text-zinc-300">メールアドレス</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                        disabled={!supabaseReady}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password" className="dark:text-zinc-300">パスワード</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        disabled={!supabaseReady}
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {loadingMessage && <p className="text-sm text-green-600 dark:text-green-400">{loadingMessage}</p>}
                    <Button
                      type="submit"
                      className="h-11 w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white hover:from-blue-700 hover:to-indigo-700"
                      disabled={isLoading || !supabaseReady}
                    >
                      {isLoading ? loadingMessage || "ログイン中..." : "ログイン"}
                    </Button>
                  </div>
                  <div className="mt-6 text-center text-sm text-gray-600 dark:text-zinc-400">
                    アカウントをお持ちでないですか？{" "}
                    <Link
                      href="/auth/sign-up"
                      className="font-medium text-blue-600 underline underline-offset-4 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      新規登録
                    </Link>
                  </div>

                  {/* 管理者モード時のみ表示 */}
                  {adminMode && (
                    <div className="mt-3 text-center">
                      <Link
                        href="/auth/admin-register"
                        className="inline-flex items-center gap-1 text-xs text-amber-600 underline underline-offset-4 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        管理者アカウント登録
                      </Link>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
