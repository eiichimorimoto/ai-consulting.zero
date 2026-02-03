'use client'

import { useState, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Home, Mail, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/** 有効期限切れか（まだリンクを押していない想定 → 再送を主導線） */
const isExpiredFlow = (error: string | null) =>
  error === 'flow_expired' || error === 'code_expired'

/** 無効コード・アクセス拒否（リンク使用済み想定 → ログインを主導線） */
const isAlreadyUsedFlow = (error: string | null) =>
  error === 'invalid_code' || error === 'access_denied'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [showResendForUsedFlow, setShowResendForUsedFlow] = useState(false)

  const handleResendEmail = async () => {
    if (!email) {
      setResendError('メールアドレスを入力してください')
      return
    }

    setResending(true)
    setResendError(null)

    try {
      const supabase = createClient()
      if (!supabase) {
        setResendError('認証クライアントの初期化に失敗しました')
        return
      }
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (resendErr) {
        const msg = resendErr.message.toLowerCase()
        if (msg.includes('already') || msg.includes('confirmed') || msg.includes('registered') || msg.includes('valid')) {
          setResendError('このメールアドレスは既に確認済みです。下の「ログインする」から、メールアドレスとパスワードでログインしてください。')
        } else {
          setResendError(resendErr.message)
        }
      } else {
        setResendSuccess(true)
      }
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : '再送信に失敗しました')
    } finally {
      setResending(false)
    }
  }

  const getErrorContent = () => {
    if (isExpiredFlow(error)) {
      return {
        title: '確認リンクの有効期限が切れました',
        description: 'メール内のリンクは約1時間で無効になります。まだリンクを開いていない場合は、下記から確認メールを再送信してください。',
        primaryIsLogin: false,
      }
    }
    if (error === 'invalid_code') {
      return {
        title: '確認リンクは1回のみ有効です',
        description: '確認リンクは1回だけ使えます。既に使用済みのためこのエラーになっていることがあります。ログインしてください。',
        primaryIsLogin: true,
      }
    }
    if (error === 'access_denied') {
      return {
        title: 'アクセスが拒否されました',
        description: '確認リンクは1回だけ使えます。既に使用済みのためこのエラーになっていることがあります。ログインしてください。',
        primaryIsLogin: true,
      }
    }
    return {
      title: 'エラーが発生しました',
      description: error || '予期しないエラーが発生しました。',
      primaryIsLogin: true,
    }
  }

  const content = getErrorContent()
  const showResendForm = isExpiredFlow(error) && !resendSuccess
  const showLoginPrimary = content.primaryIsLogin || resendSuccess

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="shadow-2xl border border-gray-200 bg-white">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold">{content.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-6">{content.description}</p>

              {/* 有効期限切れ：主導線＝再送信フォーム */}
              {showResendForm && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 justify-center mb-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">確認メールを再送信</span>
                  </div>
                  <input
                    type="email"
                    placeholder="登録したメールアドレス"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {resendError && (
                    <p className="text-xs text-red-500 mb-2">{resendError}</p>
                  )}
                  <button
                    onClick={handleResendEmail}
                    disabled={resending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {resending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        確認メールを再送信
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* 再送信成功後：主導線＝ログイン */}
              {resendSuccess && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-800 font-medium">確認メールを再送信しました</p>
                  <p className="text-sm text-green-700 mt-1">
                    メールをご確認ください。届かない場合は既に確認済みの可能性があります。下の「ログインする」を試してください。
                  </p>
                </div>
              )}

              {/* 有効期限切れ時の副案内：再送しても届かない場合 */}
              {isExpiredFlow(error) && !resendSuccess && (
                <p className="text-sm text-gray-600 mb-4">
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
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      まだメールのリンクを1回も開いていない場合は、確認メールの再送信もできます
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
                      <p className="text-sm text-slate-700 mb-3">確認メールを再送信</p>
                      <input
                        type="email"
                        placeholder="登録したメールアドレス"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {resendError && <p className="text-xs text-red-500 mb-2">{resendError}</p>}
                      <button
                        onClick={handleResendEmail}
                        disabled={resending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {resending ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> 送信中...</>
                        ) : (
                          <><Mail className="w-4 h-4" /> 確認メールを再送信</>
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
                  className={`block w-full py-2.5 text-center rounded-lg font-medium transition-colors ${
                    showLoginPrimary
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
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
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
