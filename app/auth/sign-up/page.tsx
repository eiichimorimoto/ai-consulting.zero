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
import { AlertTriangle, Home, CheckCircle, Eye, EyeOff } from "lucide-react"
import { checkPasswordStrength } from "@/lib/auth-utils"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof checkPasswordStrength> | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const router = useRouter()

  const supabaseReady = isSupabaseConfigured()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()

    console.log('🔍 Signup process started')
    console.log('Supabase client:', supabase ? 'Created' : 'NULL')
    
    // 環境変数の確認
    console.log('Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    })

    if (!supabase) {
      console.error('❌ Supabase client is null')
      setError("Supabaseが設定されていません。環境変数を確認してください。")
      return
    }

    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("パスワードが一致しません")
      setIsLoading(false)
      return
    }

    // パスワード強度チェック
    const strength = checkPasswordStrength(password)
    if (strength.score < 2) {
      setError("パスワードが弱すぎます。より強力なパスワードを設定してください。")
      setIsLoading(false)
      return
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("有効なメールアドレスを入力してください")
      setIsLoading(false)
      return
    }

    // より厳密なメールアドレス検証（一般的なドメイン形式をチェック）
    const emailParts = email.split('@')
    if (emailParts.length !== 2 || emailParts[0].length === 0 || emailParts[1].length === 0) {
      setError("有効なメールアドレスを入力してください")
      setIsLoading(false)
      return
    }

    const domainParts = emailParts[1].split('.')
    if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
      setError("有効なメールアドレスを入力してください（ドメイン名が正しくありません）")
      setIsLoading(false)
      return
    }

    try {
      console.log('📤 Calling supabase.auth.signUp...')
      console.log('Email:', email)
      console.log('Password length:', password.length)
      console.log('Redirect URL:', process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/complete-profile`)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/complete-profile`,
          // メール確認を強制する（Supabaseの設定に依存）
        },
      })
      
      console.log('📥 SignUp response received')
      console.log('Response data:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        hasError: !!error,
      })
      
      if (error) {
        console.error('❌ Signup error:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack,
        })
        
        // より詳細なエラーメッセージ
        let errorMessage = error.message
        if (error.message.includes('User already registered')) {
          errorMessage = 'このメールアドレスは既に登録されています。'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'メールアドレスの形式が正しくありません。'
        } else if (error.message.includes('Password')) {
          errorMessage = 'パスワードが要件を満たしていません。'
        }
        
        throw new Error(errorMessage)
      }

      if (!data || !data.user) {
        console.error('❌ No user data in response:', data)
        throw new Error('ユーザーの作成に失敗しました。Supabaseの応答にユーザーデータが含まれていません。')
      }

      // Supabaseは「再サインアップ」の場合、identities が空配列で返る
      const identities = (data.user as any)?.identities
      if (Array.isArray(identities) && identities.length === 0) {
        throw new Error('このメールアドレスは既に登録されています。メールを確認するか、ログインしてください。')
      }

      // メール送信の状態を確認
      console.log('✅ Signup successful:', {
        userId: data.user.id,
        email: data.user.email,
        emailConfirmed: data.user.email_confirmed_at,
        createdAt: data.user.created_at,
        hasSession: !!data.session,
        sessionType: data.session ? 'Session created' : 'No session (email confirmation required)',
      })
      
      // SupabaseのUsersテーブルにユーザーが作成されたか確認
      console.log('🔍 Verifying user creation in Supabase...')
      console.log('User ID:', data.user.id)
      console.log('User Email:', data.user.email)
      console.log('User Created At:', data.user.created_at)

      // メール確認が必要な場合（sessionがnull）
      if (!data.session && !data.user.email_confirmed_at) {
        console.log('Email confirmation required - check your inbox')
      }

      // トリガー関数がプロファイルを作成するまで待つ
      // トリガー関数（handle_new_user）はSECURITY DEFINERで実行されるため、RLSをバイパスしてプロファイルを作成します
      console.log('⏳ Waiting for trigger function to create profile...')
      
      // トリガー関数の実行を待つ（最大5秒）
      let profileCreated = false
      const maxAttempts = 5
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // プロファイルが作成されたか確認
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .single()
        
        if (profile) {
          console.log(`✅ Profile created by trigger function (attempt ${attempt + 1}):`, profile)
          profileCreated = true
          break
        } else {
          console.log(`⏳ Waiting for profile creation... (attempt ${attempt + 1}/${maxAttempts})`)
        }
      }
      
      // プロファイルが作成されていない場合のみAPIルートを呼び出す
      if (!profileCreated) {
        console.log('⚠️ Profile not created by trigger function, attempting API creation...')
        
        try {
          const response = await fetch('/api/create-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.name,
            }),
          })

          let result: any = null
          let responseText: string = ''
          
          try {
            responseText = await response.text()
            if (responseText && responseText.trim()) {
              try {
                result = JSON.parse(responseText)
              } catch (parseError) {
                console.warn('Failed to parse response as JSON:', parseError)
                result = { rawText: responseText }
              }
            }
          } catch (readError) {
            console.error('Failed to read response:', readError)
          }

          if (response.ok || result?.code === 'PROFILE_EXISTS') {
            console.log('✅ Profile created via API:', result)
          } else {
            // APIエラーでも続行（トリガー関数が後で作成する可能性がある）
            const errorCode = result?.code
            const errorDetails = result?.details || result?.error || ''
            
            if (errorCode === '42501' || errorDetails.includes('row-level security')) {
              console.warn('⚠️ RLS policy violation - profile may be created by trigger function later')
            } else {
              console.warn('⚠️ Profile creation API error (non-critical):', result?.error || result?.details)
            }
          }
        } catch (apiError) {
          console.warn('⚠️ API call error (non-critical):', apiError)
          // エラーをスローせずに続行
        }
      }

      // サインアップ成功後の確認
      console.log('✅ All signup steps completed successfully')
      console.log('📋 Final status:', {
        userId: data.user.id,
        email: data.user.email,
        emailConfirmed: data.user.email_confirmed_at,
        profileCreated: 'Processing...',
      })
      
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      console.error('❌ Signup error details:', error)
      
      // エラーの詳細をログに記録
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
        
        // エラーメッセージを日本語化
        let errorMessage = error.message
        if (error.message.includes('Database error') || error.message.includes('プロファイルの作成に失敗')) {
          errorMessage = 'データベースエラー: ユーザーの保存に失敗しました。管理者にお問い合わせください。'
        } else if (error.message.includes('User already registered') || error.message.includes('already registered') || error.message.includes('already exists')) {
          errorMessage = 'このメールアドレスは既に登録されています。'
        } else if (error.message.includes('Password') || error.message.includes('password')) {
          errorMessage = 'パスワードが弱すぎます。より強力なパスワードを設定してください。'
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません。'
        } else if (error.message.includes('Email address') && error.message.includes('invalid')) {
          errorMessage = 'メールアドレスの形式が正しくありません。有効なメールアドレスを入力してください。\n例: yourname@example.com'
        } else if (error.message.includes('email') && error.message.includes('invalid')) {
          errorMessage = 'メールアドレスの形式が正しくありません。有効なメールアドレスを入力してください。\n例: yourname@example.com'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'メールアドレスの形式が正しくありません。有効なメールアドレスを入力してください。'
        } else if (error.message.includes('Supabaseが設定されていません')) {
          errorMessage = 'Supabaseが設定されていません。環境変数（NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY）を確認してください。'
        } else if (error.message.includes('ユーザーの作成に失敗')) {
          errorMessage = 'ユーザーの作成に失敗しました。Supabaseの設定を確認してください。'
        }
        setError(errorMessage)
      } else {
        console.error('Unknown error type:', typeof error, error)
        setError('エラーが発生しました。ブラウザのコンソールを確認してください。')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full">
      {/* Left side - AI Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 relative overflow-hidden items-center justify-center">
        {/* Quantum Computer Background Image */}
        <div className="absolute inset-0 opacity-30">
          <img 
            src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop"
            alt="Quantum Computer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-blue-500/70 to-indigo-600/80"></div>
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
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center animate-bounce">
              <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">AIの力で<br />経営を変革</h2>
            <p className="text-white/90 text-lg">24時間365日、AIがあなたのビジネスをサポートします</p>
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
              <CardTitle className="text-2xl font-bold">新規登録</CardTitle>
              <CardDescription>アカウントを作成してAIコンサルティングを始めましょう</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="8文字以上（大文字・小文字・数字・記号を含む）"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setPasswordStrength(checkPasswordStrength(e.target.value))
                        }}
                        className="h-11 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-10"
                        disabled={!supabaseReady}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {password && passwordStrength && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                passwordStrength.score === 0 || passwordStrength.score === 1
                                  ? 'bg-red-500'
                                  : passwordStrength.score === 2
                                  ? 'bg-yellow-500'
                                  : passwordStrength.score === 3
                                  ? 'bg-blue-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            passwordStrength.score === 0 || passwordStrength.score === 1
                              ? 'text-red-600'
                              : passwordStrength.score === 2
                              ? 'text-yellow-600'
                              : passwordStrength.score === 3
                              ? 'text-blue-600'
                              : 'text-green-600'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        {passwordStrength.feedback.length > 0 && (
                          <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
                            {passwordStrength.feedback.map((msg, idx) => (
                              <li key={idx} className="flex items-center gap-1">
                                <span className="text-red-500">•</span>
                                {msg}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">パスワード（確認）</Label>
                    <div className="relative">
                      <Input
                        id="repeat-password"
                        type={showRepeatPassword ? "text" : "password"}
                        placeholder="パスワードを再入力"
                        required
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        className="h-11 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-10"
                        disabled={!supabaseReady}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showRepeatPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
                    disabled={isLoading || !supabaseReady}
                  >
                    {isLoading ? "登録中..." : "アカウントを作成"}
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm text-gray-600">
                  すでにアカウントをお持ちですか？{" "}
                  <Link
                    href="/auth/login"
                    className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-4"
                  >
                    ログイン
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  )
}
