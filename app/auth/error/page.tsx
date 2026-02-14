"use client"

import { useState, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Home, Mail, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/** 有効期限切れか（まだリンクを押していない想定 → 再送を主導線） */
const isExpiredFlow = (error: string | null) => error === "flow_expired" || error === "code_expired"

/** 無効コード・アクセス拒否（リンク使用済み想定 → ログインを主導線） */
const isAlreadyUsedFlow = (error: string | null) =>
  error === "invalid_code" || error === "access_denied"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const [email, setEmail] = useState("")
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [showResendForUsedFlow, setShowResendForUsedFlow] = useState(false)

  const handleResendEmail = async () => {
    if (!email) {
      setResendError("メールアドレスを入力してください")
      return
    }

    setResending(true)
    setResendError(null)

    try {
      const supabase = createClient()
      if (!supabase) {
        setResendError("認証クライアントの初期化に失敗しました")
        return
      }
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email,
      })

      if (resendErr) {
        const msg = resendErr.message.toLowerCase()
        if (
          msg.includes("already") ||
          msg.includes("confirmed") ||
          msg.includes("registered") ||
          msg.includes("valid")
        ) {
          setResendError(
            "このメールアドレスは既に確認済みです。下の「ログインする」から、メールアドレスとパスワードでログインしてください。"
          )
        } else {
          setResendError(resendErr.message)
        }
      } else {
        setResendSuccess(true)
      }
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : "再送信に失敗しました")
    } finally {
      setResending(false)
    }
  }

  const getErrorContent = () => {
    if (isExpiredFlow(error)) {
      return {
        title: "確認リンクの有効期限が切れました",
        description:
          "メール内のリンクは約1時間で無効になります。まだリンクを開いていない場合は、下記から確認メールを再送信してください。",
        primaryIsLogin: false,
      }
    }
    if (error === "invalid_code") {
      return {
        title: "確認リンクは1回のみ有効です",
        description:
          "確認リンクは1回だけ使えます。既に使用済みのためこのエラーになっていることがあります。ログインしてください。",
        primaryIsLogin: true,
      }
    }
    if (error === "access_denied") {
      return {
        title: "アクセスが拒否されました",
        description:
          "確認リンクは1回だけ使えます。既に使用済みのためこのエラーになっていることがあります。ログインしてください。",
        primaryIsLogin: true,
      }
    }
    return {
      title: "エラーが発生しました",
      description: error || "予期しないエラーが発生しました。",
      primaryIsLogin: true,
    }
  }

  const content = getErrorContent()
  const showResendForm = isExpiredFlow(error) && !resendSuccess
  const showLoginPrimary = content.primaryIsLogin || resendSuccess

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="border border-gray-200 bg-white shadow-2xl">
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold">{content.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-sm text-gray-600">{content.description}</p>

              {/* 有効期限切れ：主導線＝再送信フォーム */}
              {showResendForm && (
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center justify-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">確認メールを再送信</span>
                  </div>
                  <input
                    type="email"
                    placeholder="登録したメールアドレス"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mb-3 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {resendError && <p className="mb-2 text-xs text-red-500">{resendError}</p>}
                  <button
                    onClick={handleResendEmail}
                    disabled={resending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {resending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        確認メールを再送信
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* 再送信成功後：主導線＝ログイン */}
              {resendSuccess && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="font-medium text-green-800">確認メールを再送信しました</p>
                  <p className="mt-1 text-sm text-green-700">
                    メールをご確認ください。届かない場合は既に確認済みの可能性があります。下の「ログインする」を試してください。
                  </p>
                </div>
              )}

              {/* 有効期限切れ時の副案内：再送しても届かない場合 */}
              {isExpiredFlow(error) && !resendSuccess && (
                <p className="mb-4 text-sm text-gray-600">
                  再送しても届かない場合は、既にアカウントが確認済みになっていることがあります。その場合は下の「ログインする」を試してください。
                </p>
              )}

              {/* 無効コード・アクセス拒否：補助で再送信を出せる */}
              {isAlreadyUsedFlow(error) && !resendSuccess && (
                <div className="mb-4">
                  {!showResendForUsedFlow ? (
                    <button
                      type="button"
                      onClick={() => setShowResendForUsedFlow(true)}
                      className="text-sm text-blue-600 underline hover:text-blue-800"
                    >
                      まだメールのリンクを1回も開いていない場合は、確認メールの再送信もできます
                    </button>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
                      <p className="mb-3 text-sm text-slate-700">確認メールを再送信</p>
                      <input
                        type="email"
                        placeholder="登録したメールアドレス"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mb-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {resendError && <p className="mb-2 text-xs text-red-500">{resendError}</p>}
                      <button
                        onClick={handleResendEmail}
                        disabled={resending}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                      >
                        {resending ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> 送信中...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" /> 確認メールを再送信
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 主 CTA：ログイン or 副導線 */}
              <div className="space-y-3">
                <Link
                  href="/auth/login"
                  className={`block w-full rounded-lg py-2.5 text-center font-medium transition-colors ${
                    showLoginPrimary
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  ログインする
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="block text-center text-sm text-gray-500 hover:text-gray-700"
                >
                  新規登録はこちら
                </Link>
              </div>
            </CardContent>
          </Card>
          <div className="text-center">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              <Home size={18} />
              <span>トップページに戻る</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-6 md:p-10">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  )
}
