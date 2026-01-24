'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Loader2, AlertTriangle, CheckCircle, TrendingUp, Shield, Smartphone, Zap, RefreshCw, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

  const mapDiagnosisError = (rawMessage: string) => {
    const message = rawMessage || ''

    if (message.includes('PageSpeed APIキー')) {
      return '分析に必要な設定（PageSpeed APIキー）が未設定です。管理者にお問い合わせください。'
    }
    if (message.includes('400 Bad Request') || message.includes('無効なURL') || message.includes('Invalid URL')) {
      return 'URLの形式が不正です。例: https://example.com の形式で入力してください。'
    }
    if (
      message.includes('FAILED_DOCUMENT_REQUEST') ||
      message.includes('ERR_CONNECTION_FAILED')
    ) {
      return 'サイトに接続できませんでした。URLが公開されているか、http/httpsが正しいか確認してください。'
    }
    if (message.includes('ENOTFOUND') || message.includes('DNS')) {
      return 'URLのドメインが見つかりませんでした。スペルやドメインの有効性を確認してください。'
    }
    if (message.includes('SSL') || message.includes('CERT') || message.includes('HTTPS')) {
      return 'SSL証明書の問題で接続できませんでした。httpsでアクセス可能か確認してください。'
    }
    if (message.includes('401') || message.includes('403') || message.includes('Forbidden')) {
      return 'アクセスが拒否されました。認証やIP制限、WAF設定をご確認ください。'
    }
    if (message.includes('429')) {
      return '混雑しています。少し時間をおいてから再度お試しください。'
    }
    if (message.includes('500') || message.includes('PageSpeed API error')) {
      return '分析に失敗しました。しばらく待ってから再度お試しください。'
    }

    return message || '分析中に不明なエラーが発生しました。'
  }

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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    if (score >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return '優先度高'
      case 'medium': return '優先度中'
      case 'low': return '優先度低'
      default: return '-'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return <Zap className="w-5 h-5" />
      case 'security': return <Shield className="w-5 h-5" />
      case 'mobile': return <Smartphone className="w-5 h-5" />
      case 'seo': return <TrendingUp className="w-5 h-5" />
      default: return <AlertTriangle className="w-5 h-5" />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'performance': return 'パフォーマンス'
      case 'security': return 'セキュリティ'
      case 'mobile': return 'モバイル'
      case 'seo': return 'SEO'
      default: return category
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
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">会社情報を取得中...</p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 text-lg">エラー</p>
                <p className="text-red-700">{error}</p>
                {error.includes('設定画面') && (
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    設定画面へ
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ready to Analyze - ボタン表示（結果がない時） */}
          {!isLoading && !error && !result && !isAnalyzing && companyUrl && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Globe className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Webサイト分析の準備ができました</h2>
              <p className="text-gray-600 mb-6">
                {companyName}のWebサイト（{companyUrl}）を分析します。<br/>
                Google PageSpeed Insightsを使用して、パフォーマンス、SEO、セキュリティなどを診断します。
              </p>
              <button
                onClick={runAnalysis}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                <Play className="w-4 h-4" />
                Webサイト分析を開始
              </button>
            </div>
          )}

          {/* Analyzing State */}
          {isAnalyzing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Webサイトを分析中...</p>
              <p className="text-gray-600 mt-2">
                Google PageSpeed Insightsでサイトを分析しています。<br/>
                通常30〜60秒程度かかります。
              </p>
            </div>
          )}

          {/* Results - 結果がある時も同じページに表示 */}
          {result && !isAnalyzing && (
            <div className="space-y-6">
              {/* 再分析ボタン（結果の上に小さく表示） */}
              <div className="flex justify-end">
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  再分析
                </button>
              </div>

              {/* Overall Score */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">診断結果</h2>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{result.url}</span>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getScoreColor(result.overallScore)}`}>
                      {result.overallScore}
                    </div>
                    <div className="text-gray-600 mt-1">総合スコア</div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full ${getScoreBgColor(result.overallScore)} transition-all duration-500`}
                        style={{ width: `${result.overallScore}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Metrics */}
              {result.metrics && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">詳細メトリクス</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Smartphone className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.mobileScore)}`} />
                      <div className={`text-2xl font-bold ${getScoreColor(result.metrics.mobileScore)}`}>
                        {result.metrics.mobileScore}
                      </div>
                      <div className="text-sm text-gray-600">モバイル</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Zap className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.desktopScore)}`} />
                      <div className={`text-2xl font-bold ${getScoreColor(result.metrics.desktopScore)}`}>
                        {result.metrics.desktopScore}
                      </div>
                      <div className="text-sm text-gray-600">デスクトップ</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.seoScore)}`} />
                      <div className={`text-2xl font-bold ${getScoreColor(result.metrics.seoScore)}`}>
                        {result.metrics.seoScore}
                      </div>
                      <div className="text-sm text-gray-600">SEO</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.accessibilityScore)}`} />
                      <div className={`text-2xl font-bold ${getScoreColor(result.metrics.accessibilityScore)}`}>
                        {result.metrics.accessibilityScore}
                      </div>
                      <div className="text-sm text-gray-600">アクセシビリティ</div>
                    </div>
                  </div>
                  
                  {/* Core Web Vitals */}
                  <h3 className="text-md font-semibold text-gray-800 mb-3">Core Web Vitals</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">FCP (初回描画)</div>
                      <div className={`text-lg font-bold ${result.metrics.fcp <= 1800 ? 'text-green-500' : result.metrics.fcp <= 3000 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {(result.metrics.fcp / 1000).toFixed(2)}秒
                      </div>
                      <div className="text-xs text-gray-500">目標: 1.8秒以下</div>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">LCP (最大描画)</div>
                      <div className={`text-lg font-bold ${result.metrics.lcp <= 2500 ? 'text-green-500' : result.metrics.lcp <= 4000 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {(result.metrics.lcp / 1000).toFixed(2)}秒
                      </div>
                      <div className="text-xs text-gray-500">目標: 2.5秒以下</div>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">CLS (シフト)</div>
                      <div className={`text-lg font-bold ${parseFloat(result.metrics.cls) <= 0.1 ? 'text-green-500' : parseFloat(result.metrics.cls) <= 0.25 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {result.metrics.cls}
                      </div>
                      <div className="text-xs text-gray-500">目標: 0.1以下</div>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">TTFB (応答時間)</div>
                      <div className={`text-lg font-bold ${(result.metrics.ttfb || 0) <= 800 ? 'text-green-500' : (result.metrics.ttfb || 0) <= 1800 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {((result.metrics.ttfb || 0) / 1000).toFixed(2)}秒
                      </div>
                      <div className="text-xs text-gray-500">目標: 0.8秒以下</div>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">TBT (ブロック)</div>
                      <div className={`text-lg font-bold ${(result.metrics.tbt || 0) <= 200 ? 'text-green-500' : (result.metrics.tbt || 0) <= 600 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {result.metrics.tbt || 0}ms
                      </div>
                      <div className="text-xs text-gray-500">目標: 200ms以下</div>
                    </div>
                  </div>

                  {/* SSL & Mobile Friendly */}
                  <div className="flex gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${result.metrics.hasSSL ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <Shield className="w-4 h-4" />
                      SSL: {result.metrics.hasSSL ? '対応済み' : '未対応'}
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${result.metrics.isMobileFriendly ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <Smartphone className="w-4 h-4" />
                      モバイル対応: {result.metrics.isMobileFriendly ? '良好' : '要改善'}
                    </div>
                  </div>
                </div>
              )}

              {/* Issues */}
              {result.topIssues && result.topIssues.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">検出された課題</h2>
                  <div className="space-y-4">
                    {result.topIssues.map((issue, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getCategoryIcon(issue.category)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                {getCategoryLabel(issue.category)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                issue.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                                issue.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                issue.severity === 'low' ? 'bg-blue-200 text-blue-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {getSeverityLabel(issue.severity)}
                              </span>
                            </div>
                            <div className="font-semibold text-lg mb-1">{issue.issue}</div>
                            <p className="text-sm opacity-80">{issue.impact}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                <h2 className="text-lg font-bold mb-2">改善のご提案</h2>
                <p className="text-blue-100 mb-4">
                  検出された課題を解決することで、ユーザー体験の向上と検索順位の改善が期待できます。
                  詳細な改善プランについてはお問い合わせください。
                </p>
                <button
                  onClick={() => router.push('/contact')}
                  className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  改善について相談する
                </button>
              </div>
            </div>
          )}
      </main>
    </div>
  )
}
