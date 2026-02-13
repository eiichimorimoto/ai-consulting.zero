'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Loader2, AlertTriangle, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { mapDiagnosisError } from '@/lib/website-analysis/helpers'
import AnalysisSteps from '@/components/website-analysis/AnalysisSteps'
import DiagnosisResult from '@/components/website-analysis/DiagnosisResult'

interface DiagnosisResult {
  overallScore: number
  topIssues: {
    category: string
    severity: string
    issue: string
    impact: string
  }[]
  metrics?: {
    mobileScore: number
    desktopScore: number
    seoScore: number
    accessibilityScore: number
    hasSSL: boolean
    isMobileFriendly: boolean
    fcp: number
    lcp: number
    cls: string
    ttfb: number
    tbt: number
  }
  url?: string
}

export default function WebsiteAnalysisPage() {
  const router = useRouter()
  const [companyUrl, setCompanyUrl] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  // 分析ステップの定義
  const analysisSteps = [
    { label: 'サイトに接続中...', duration: 2000 },
    { label: 'ページ構造を解析中...', duration: 3000 },
    { label: 'パフォーマンスを測定中...', duration: 5000 },
    { label: 'SEO要素をチェック中...', duration: 4000 },
    { label: 'セキュリティを確認中...', duration: 3000 },
    { label: 'AIが課題を分析中...', duration: 8000 },
    { label: 'レポートを生成中...', duration: 3000 },
  ]

  // 会社情報を取得（分析は実行しない）
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const supabase = createClient()
        if (!supabase) {
          setError('Supabaseが設定されていません')
          setIsLoading(false)
          return
        }

        // ユーザー情報取得
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          router.push('/auth/login')
          return
        }

        // プロファイル取得
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', userData.user.id)
          .single()

        if (!profile?.company_id) {
          setError('会社情報が登録されていません')
          setIsLoading(false)
          return
        }

        // 会社情報取得
        const { data: company } = await supabase
          .from('companies')
          .select('name, website')
          .eq('id', profile.company_id)
          .single()

        if (!company?.website) {
          setError('会社のWebサイトURLが登録されていません。設定画面からURLを追加してください。')
          setIsLoading(false)
          return
        }

        setCompanyUrl(company.website)
        setCompanyName(company.name || '')
        setIsLoading(false)
      } catch (err: unknown) {
        console.error('Error fetching company:', err)
        setError('会社情報の取得に失敗しました')
        setIsLoading(false)
      }
    }

    fetchCompany()
  }, [router])

  // 分析中のステップ進行
  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStep(0)
      return
    }

    // 各ステップの時間に応じて進行
    const timers: NodeJS.Timeout[] = []
    let accumulatedTime = 0
    
    analysisSteps.forEach((step, index) => {
      if (index > 0) {
        accumulatedTime += analysisSteps[index - 1].duration
        const timer = setTimeout(() => {
          setCurrentStep(index)
        }, accumulatedTime)
        timers.push(timer)
      }
    })

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [isAnalyzing])


  const runAnalysis = async () => {
    if (!companyUrl) return

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/diagnose-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: companyUrl }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || '分析に失敗しました')
      }

      // APIレスポンスの data フィールドから取得
      const data = responseData.data || responseData

      setResult({
        overallScore: data.overallScore,
        topIssues: data.topIssues || [],
        metrics: data.metrics,
        url: data.url || companyUrl,
      })
    } catch (err: unknown) {
      const errorMessage = mapDiagnosisError(err instanceof Error ? err.message : '')
      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleConsultAboutReport = () => {
    if (!result) return
    
    try {
      // sessionStorageに診断結果を保存
      sessionStorage.setItem('website_analysis_result', JSON.stringify({
        url: result.url,
        overallScore: result.overallScore,
        topIssues: result.topIssues,
        metrics: result.metrics,
        analyzedAt: new Date().toISOString()
      }))
      
      // 相談画面へ遷移
      router.push('/consulting/start')
    } catch (error) {
      console.error('Failed to save analysis result:', error)
      // フォールバック: 通常の遷移
      router.push('/consulting/start')
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダーはConditionalHeaderで表示 */}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ページタイトル */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-sm bg-blue-100 flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Webサイト分析</h1>
                {companyName && companyUrl && (
                  <p className="text-gray-600 text-sm">
                    {companyName} - <a href={companyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{companyUrl}</a>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded shadow-sm border border-gray-200 p-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">会社情報を取得中...</p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-200 rounded p-6 flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 text-lg">エラー</p>
                <p className="text-red-700">{error}</p>
                {error.includes('設定画面') && (
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors"
                  >
                    設定画面へ
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ready to Analyze - ボタン表示（結果がない時） */}
          {!isLoading && !error && !result && !isAnalyzing && companyUrl && (
            <div className="bg-white rounded shadow-sm border border-gray-200 p-8 text-center">
              <Globe className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Webサイト分析の準備ができました</h2>
              <p className="text-gray-600 mb-6">
                {companyName}のWebサイト（{companyUrl}）を分析します。<br/>
                Google PageSpeed Insightsを使用して、パフォーマンス、SEO、セキュリティなどを診断します。
              </p>
              <button
                onClick={runAnalysis}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                <Play className="w-4 h-4" />
                Webサイト分析を開始
              </button>
            </div>
          )}

          {/* Analyzing State */}
          {isAnalyzing && (
            <AnalysisSteps steps={analysisSteps} currentStep={currentStep} />
          )}


          {/* Results */}
          {result && !isAnalyzing && (
            <DiagnosisResult
              result={result}
              isAnalyzing={isAnalyzing}
              onReanalyze={runAnalysis}
              onConsult={handleConsultAboutReport}
            />
          )}
      </main>
    </div>
  )
}
