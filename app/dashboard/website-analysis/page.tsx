'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Globe, Loader2, ArrowLeft, AlertTriangle, CheckCircle, TrendingUp, Shield, Smartphone, Zap, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import '../dashboard.css'

interface DiagnosisResult {
  overallScore: number
  topIssues: {
    category: string
    severity: string
    issue: string
    impact: string
  }[]
  metrics?: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
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

  // 会社情報を取得して自動分析
  useEffect(() => {
    const fetchCompanyAndAnalyze = async () => {
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

        // 自動で分析開始
        await runAnalysis(company.website)
      } catch (err: any) {
        console.error('Error fetching company:', err)
        setError('会社情報の取得に失敗しました')
        setIsLoading(false)
      }
    }

    fetchCompanyAndAnalyze()
  }, [router])

  const runAnalysis = async (url: string) => {
    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/diagnose-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '分析に失敗しました')
      }

      setResult({
        ...data,
        url,
      })
    } catch (err: any) {
      setError(err.message || '分析中にエラーが発生しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRefresh = () => {
    if (companyUrl) {
      runAnalysis(companyUrl)
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
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link href="/" className="logo">
            <Image
              src="/info-data/AI-LOGO007.png"
              alt="SolveWise"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="logo-text">SolveWise</span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">メイン</div>
            <Link href="/dashboard" className="nav-item">
              <svg className="nav-icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              ダッシュボード
            </Link>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">分析</div>
            <a className="nav-item" onClick={() => router.push('/dashboard/industry')}>
              <svg className="nav-icon" viewBox="0 0 24 24">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
              業界動向
            </a>
            <a className="nav-item" onClick={() => router.push('/dashboard/company-analysis')}>
              <svg className="nav-icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
              </svg>
              企業分析
            </a>
            <a className="nav-item active" onClick={() => router.push('/dashboard/website-analysis')}>
              <svg className="nav-icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Webサイト分析
            </a>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">設定</div>
            <Link href="/dashboard/settings" className="nav-item">
              <svg className="nav-icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              アカウント設定
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="p-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Webサイト分析</h1>
                {companyName && companyUrl && (
                  <p className="text-gray-600 text-sm">
                    {companyName} - <a href={companyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{companyUrl}</a>
                  </p>
                )}
              </div>
            </div>
            {result && (
              <button
                onClick={handleRefresh}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                再分析
              </button>
            )}
          </div>

          {/* Loading State */}
          {(isLoading || isAnalyzing) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">
                {isLoading ? '会社情報を取得中...' : 'Webサイトを分析中...'}
              </p>
              <p className="text-gray-600 mt-2">
                {isAnalyzing && 'Google PageSpeed Insightsでサイトを分析しています'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && !isAnalyzing && (
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

          {/* Results */}
          {result && !isAnalyzing && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">診断結果</h2>
                  <span className="text-sm text-gray-500">{result.url}</span>
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

              {/* Metrics */}
              {result.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                    <Zap className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.performance)}`} />
                    <div className={`text-2xl font-bold ${getScoreColor(result.metrics.performance)}`}>
                      {result.metrics.performance}
                    </div>
                    <div className="text-sm text-gray-600">パフォーマンス</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                    <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.accessibility)}`} />
                    <div className={`text-2xl font-bold ${getScoreColor(result.metrics.accessibility)}`}>
                      {result.metrics.accessibility}
                    </div>
                    <div className="text-sm text-gray-600">アクセシビリティ</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                    <Shield className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.bestPractices)}`} />
                    <div className={`text-2xl font-bold ${getScoreColor(result.metrics.bestPractices)}`}>
                      {result.metrics.bestPractices}
                    </div>
                    <div className="text-sm text-gray-600">ベストプラクティス</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                    <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.seo)}`} />
                    <div className={`text-2xl font-bold ${getScoreColor(result.metrics.seo)}`}>
                      {result.metrics.seo}
                    </div>
                    <div className="text-sm text-gray-600">SEO</div>
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
                              <span className="font-semibold">{issue.issue}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                issue.severity === 'critical' ? 'bg-red-200 text-red-800' :
                                issue.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-blue-200 text-blue-800'
                              }`}>
                                {issue.severity === 'critical' ? '重大' : issue.severity === 'warning' ? '警告' : '情報'}
                              </span>
                            </div>
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
        </div>
      </main>
    </div>
  )
}
