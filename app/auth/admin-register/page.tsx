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
import { AlertTriangle, Shield, Loader2, CheckCircle } from "lucide-react"

export default function AdminRegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"form" | "creating" | "done">("form")
  const [statusMessage, setStatusMessage] = useState("")
  const router = useRouter()

  const supabaseReady = isSupabaseConfigured()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode || !email || !password) return

    setIsLoading(true)
    setError(null)
    setStep("creating")

    try {
      // 1. 招待コード検証
      setStatusMessage("招待コードを検証中...")
      const validateRes = await fetch("/api/admin/validate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      })
      const validateData = await validateRes.json()

      if (!validateData.valid) {
        throw new Error(validateData.error || "無効な招待コードです")
      }

      // 2. アカウント作成
      setStatusMessage("アカウントを作成中...")
      const supabase = createClient()
      if (!supabase) throw new Error("Supabaseが設定されていません")

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError
      if (!signUpData.user) throw new Error("アカウントの作成に失敗しました")

      // 3. プロファイル作成を待つ（DBトリガーで自動作成される）
      setStatusMessage("プロファイルを設定中...")
      const userId = signUpData.user.id

      // ポーリングでプロファイル作成完了を待つ（最大10秒）
      let profileReady = false
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .single()
        if (profile) {
          profileReady = true
          break
        }
      }

      if (!profileReady) {
        // フォールバック: API経由でプロファイル作成を試みる
        console.warn("[Admin Register] Profile not created by trigger, trying API fallback")
      }

      // 4. 管理者権限設定 + 招待コード消費
      setStatusMessage("管理者権限を設定中...")
      const registerRes = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: inviteCode }),
      })

      if (!registerRes.ok) {
        const registerData = await registerRes.json()
        throw new Error(registerData.error || "管理者登録に失敗しました")
      }

      // 5. 完了
      setStep("done")
      setStatusMessage("管理者登録が完了しました！")

      // 2秒後にリダイレクト
      setTimeout(() => {
        router.push("/admin")
      }, 2000)
    } catch (err) {
      console.error("[Admin Register] Error:", err)
      setError(err instanceof Error ? err.message : "登録に失敗しました")
      setStep("form")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full">
      {/* Left side */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-600 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/80 via-amber-500/70 to-yellow-600/80" />
        <div className="relative z-10 px-12 text-center">
          <div className="mb-8">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
              <Shield className="h-20 w-20 text-white" />
            </div>
            <h2 className="mb-4 text-4xl font-bold text-white">
              管理者登録
            </h2>
            <p className="text-lg text-white/90">
              招待コードを使用して管理者アカウントを作成します
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 p-6 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 md:p-10 lg:w-1/2">
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
                        認証機能を使用するには、Supabaseを接続してください。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border border-amber-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                  <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-2xl font-bold dark:text-zinc-100">管理者アカウント登録</CardTitle>
                <CardDescription className="dark:text-zinc-400">招待コードを入力して管理者として登録</CardDescription>
              </CardHeader>
              <CardContent>
                {step === "done" ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                      管理者登録が完了しました！
                    </p>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                      管理ダッシュボードにリダイレクトしています...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRegister}>
                    <div className="flex flex-col gap-5">
                      <div className="grid gap-2">
                        <Label htmlFor="invite-code" className="dark:text-zinc-300">招待コード</Label>
                        <Input
                          id="invite-code"
                          type="text"
                          placeholder="招待コードを入力"
                          required
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          className="h-11 border-amber-300 bg-white font-mono text-lg tracking-wider focus:border-amber-500 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                          disabled={isLoading || !supabaseReady}
                          maxLength={8}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="admin-email" className="dark:text-zinc-300">メールアドレス</Label>
                        <Input
                          id="admin-email"
                          type="email"
                          placeholder="admin@example.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 border-gray-300 bg-white focus:border-amber-500 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                          disabled={isLoading || !supabaseReady}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="admin-password" className="dark:text-zinc-300">パスワード</Label>
                        <Input
                          id="admin-password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 border-gray-300 bg-white focus:border-amber-500 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                          disabled={isLoading || !supabaseReady}
                          minLength={8}
                          placeholder="8文字以上"
                        />
                      </div>

                      {error && <p className="text-sm text-red-500">{error}</p>}

                      {step === "creating" && (
                        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{statusMessage}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="h-11 w-full bg-gradient-to-r from-amber-600 to-yellow-600 font-semibold text-white hover:from-amber-700 hover:to-yellow-700"
                        disabled={isLoading || !supabaseReady || !inviteCode || !email || !password}
                      >
                        {isLoading ? "登録中..." : "管理者として登録"}
                      </Button>
                    </div>

                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-zinc-400">
                      既にアカウントをお持ちですか？{" "}
                      <Link
                        href="/auth/login"
                        className="font-medium text-amber-600 underline underline-offset-4 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        ログイン
                      </Link>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
