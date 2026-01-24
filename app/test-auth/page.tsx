'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, AlertCircle, Loader2, Mail, Key, RefreshCw } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'pending' | 'running'
  message: string
  details?: any
}

export default function TestAuthPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [testEmail, setTestEmail] = useState('')
  const [testPassword, setTestPassword] = useState('TestPassword123!')
  const [isRunning, setIsRunning] = useState(false)
  const [signUpResponse, setSignUpResponse] = useState<any>(null)

  const updateResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...update } : r))
  }

  const runTests = async () => {
    const timestamp = Date.now()
    const email = testEmail || `test-${timestamp}@test-auth.example.com`
    setTestEmail(email)

    setIsRunning(true)
    setSignUpResponse(null)
    setResults([
      { name: 'Environment Check', status: 'pending', message: '環境変数の確認' },
      { name: 'Supabase Client', status: 'pending', message: 'Supabaseクライアントの作成' },
      { name: 'SignUp API', status: 'pending', message: 'サインアップAPIの呼び出し' },
      { name: 'Response Analysis', status: 'pending', message: 'レスポンスの分析' },
    ])

    // Test 1: Environment Check
    updateResult('Environment Check', { status: 'running' })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    console.log('═══════════════════════════════════════════════════')
    console.log('🧪 AUTH TEST PAGE - TESTS STARTED')
    console.log('═══════════════════════════════════════════════════')
    console.log('Environment:', {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SITE_URL: siteUrl || 'NOT SET'
    })

    if (supabaseUrl && supabaseKey) {
      updateResult('Environment Check', {
        status: 'pass',
        message: '環境変数が正しく設定されています',
        details: { siteUrl: siteUrl || window.location.origin }
      })
    } else {
      updateResult('Environment Check', {
        status: 'fail',
        message: '環境変数が不足しています'
      })
      setIsRunning(false)
      return
    }

    // Test 2: Supabase Client
    updateResult('Supabase Client', { status: 'running' })
    const supabase = createClient()

    if (supabase) {
      updateResult('Supabase Client', {
        status: 'pass',
        message: 'Supabaseクライアントが作成されました'
      })
    } else {
      updateResult('Supabase Client', {
        status: 'fail',
        message: 'Supabaseクライアントの作成に失敗'
      })
      setIsRunning(false)
      return
    }

    // Test 3: SignUp API
    updateResult('SignUp API', { status: 'running' })
    const emailRedirectTo = `${(siteUrl || window.location.origin).replace(/\/$/, '')}/auth/callback`

    console.log('📧 Testing signUp with:', { email, emailRedirectTo })

    try {
      const startTime = Date.now()
      const { data, error } = await supabase.auth.signUp({
        email,
        password: testPassword,
        options: { emailRedirectTo }
      })
      const duration = Date.now() - startTime

      console.log('📥 SignUp response:', { data, error, duration })
      setSignUpResponse({ data, error, duration })

      if (error) {
        updateResult('SignUp API', {
          status: 'fail',
          message: `エラー: ${error.message}`,
          details: { errorCode: error.status, duration: `${duration}ms` }
        })
      } else {
        updateResult('SignUp API', {
          status: 'pass',
          message: `成功（${duration}ms）`,
          details: { userId: data?.user?.id, email: data?.user?.email }
        })
      }

      // Test 4: Response Analysis
      updateResult('Response Analysis', { status: 'running' })

      if (error) {
        updateResult('Response Analysis', {
          status: 'fail',
          message: 'APIエラーのため分析できません'
        })
      } else if (data?.user) {
        const identities = (data.user as any)?.identities || []
        
        if (identities.length === 0) {
          updateResult('Response Analysis', {
            status: 'fail',
            message: '既存ユーザーの再サインアップ（identities=0）',
            details: { note: 'このメールアドレスは既に登録されています' }
          })
        } else if (data.session) {
          updateResult('Response Analysis', {
            status: 'pass',
            message: 'セッション作成済み（auto-confirm有効）',
            details: { hasSession: true, identitiesCount: identities.length }
          })
        } else {
          updateResult('Response Analysis', {
            status: 'pass',
            message: '✅ メール送信成功！確認メールを確認してください',
            details: {
              hasSession: false,
              identitiesCount: identities.length,
              emailConfirmed: data.user.email_confirmed_at || 'NOT YET',
              note: '📧 メールボックスを確認してください'
            }
          })
        }
      } else {
        updateResult('Response Analysis', {
          status: 'fail',
          message: 'ユーザーデータが返されませんでした'
        })
      }

    } catch (err: unknown) {
      console.error('❌ Test error:', err)
      updateResult('SignUp API', {
        status: 'fail',
        message: `例外: ${err instanceof Error ? err.message : String(err)}`
      })
      updateResult('Response Analysis', {
        status: 'fail',
        message: 'テスト中に例外が発生'
      })
    }

    console.log('═══════════════════════════════════════════════════')
    console.log('🧪 AUTH TEST PAGE - TESTS COMPLETED')
    console.log('═══════════════════════════════════════════════════')

    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'fail': return <XCircle className="w-5 h-5 text-red-500" />
      case 'running': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-6 h-6" />
              認証フローテストページ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Configuration */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">テスト用メールアドレス（空欄で自動生成）</label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={runTests} 
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    テスト実行中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    テストを実行
                  </>
                )}
              </Button>
            </div>

            {/* Test Results */}
            {results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">テスト結果</h3>
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.status === 'pass' ? 'bg-green-50 border-green-200' :
                      result.status === 'fail' ? 'bg-red-50 border-red-200' :
                      result.status === 'running' ? 'bg-blue-50 border-blue-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {result.details && (
                      <pre className="text-xs bg-white/50 p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Raw Response */}
            {signUpResponse && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">生のAPIレスポンス</h3>
                <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto max-h-60">
                  {JSON.stringify(signUpResponse, null, 2)}
                </pre>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                テスト後の確認事項
              </h4>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                <li>F12でブラウザコンソールを開き、ログを確認</li>
                <li>メールボックス（スパムフォルダも含む）を確認</li>
                <li>テストユーザーはSupabaseダッシュボードから削除</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



