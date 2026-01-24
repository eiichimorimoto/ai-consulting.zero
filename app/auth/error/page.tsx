'use client'

import { useState, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Home, Mail, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  const isFlowExpired = error === 'flow_expired' || error === 'code_expired'

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
        setResendError(resendErr.message)
      } else {
        setResendSuccess(true)
      }
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : '再送信に失敗しました')
    } finally {
      setResending(false)
    }
  }

  const getErrorMessage = () => {
    switch (error) {
      case 'flow_expired':
      case 'code_expired':
        return {
          title: '確認リンクの有効期限が切れました',
          description: 'メール内のリンクは1時間で無効になります。下記から確認メールを再送信してください。',
        }
      case 'invalid_code':
        return {
          title: '無効な確認コード',
          description: '確認コードが無効です。再度確認メールを送信してください。',
        }
      case 'access_denied':
        return {
          title: 'アクセスが拒否されました',
          description: '認証に失敗しました。再度お試しください。',
        }
      default:
        return {
          title: 'エラーが発生しました',
          description: error || '予期しないエラーが発生しました。',
        }
    }
  }

  const errorInfo = getErrorMessage()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="shadow-2xl border border-gray-200 bg-white">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold">{errorInfo.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-6">{errorInfo.description}</p>
              
              {/* 期限切れの場合、メール再送信フォームを表示 */}
              {isFlowExpired && !resendSuccess && (
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

              {/* 再送信成功メッセージ */}
              {resendSuccess && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-800 font-medium">✅ 確認メールを再送信しました</p>
                  <p className="text-sm text-green-700 mt-1">
                    メールボックスをご確認ください。届かない場合はスパムフォルダもご確認ください。
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Link
                  href="/auth/login"
                  className="block text-blue-600 hover:text-blue-800 font-medium underline underline-offset-4"
                >
                  ログインページに戻る
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="block text-gray-500 hover:text-gray-700 text-sm"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
