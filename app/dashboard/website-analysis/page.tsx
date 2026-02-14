"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Globe, Loader2, AlertTriangle, Play } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { mapDiagnosisError } from "@/lib/website-analysis/helpers"
import AnalysisSteps from "@/components/website-analysis/AnalysisSteps"
import DiagnosisResult from "@/components/website-analysis/DiagnosisResult"

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
  const [companyName, setCompanyName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  // 分析ステップの定義
  const analysisSteps = [
    { label: "サイトに接続中...", duration: 2000 },
    { label: "ページ構造を解析中...", duration: 3000 },
    { label: "パフォーマンスを測定中...", duration: 5000 },
    { label: "SEO要素をチェック中...", duration: 4000 },
    { label: "セキュリティを確認中...", duration: 3000 },
    { label: "AIが課題を分析中...", duration: 8000 },
    { label: "レポートを生成中...", duration: 3000 },
  ]

  // 会社情報を取得（分析は実行しない）
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const supabase = createClient()
        if (!supabase) {
          setError("Supabaseが設定されていません")
          setIsLoading(false)
          return
        }

        // ユーザー情報取得
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          router.push("/auth/login")
          return
        }

        // プロファイル取得
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("user_id", userData.user.id)
          .single()

        if (!profile?.company_id) {
          setError("会社情報が登録されていません")
          setIsLoading(false)
          return
        }

        // 会社情報取得
        const { data: company } = await supabase
          .from("companies")
          .select("name, website")
          .eq("id", profile.company_id)
          .single()

        if (!company?.website) {
          setError("会社のWebサイトURLが登録されていません。設定画面からURLを追加してください。")
          setIsLoading(false)
          return
        }

        setCompanyUrl(company.website)
        setCompanyName(company.name || "")
        setIsLoading(false)
      } catch (err: unknown) {
        console.error("Error fetching company:", err)
        setError("会社情報の取得に失敗しました")
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
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [isAnalyzing])

  const runAnalysis = async () => {
    if (!companyUrl) return

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/diagnose-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: companyUrl }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "分析に失敗しました")
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
      const errorMessage = mapDiagnosisError(err instanceof Error ? err.message : "")
      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleConsultAboutReport = () => {
    if (!result) return

    try {
      // sessionStorageに診断結果を保存
      sessionStorage.setItem(
        "website_analysis_result",
        JSON.stringify({
          url: result.url,
          overallScore: result.overallScore,
          topIssues: result.topIssues,
          metrics: result.metrics,
          analyzedAt: new Date().toISOString(),
        })
      )

      // 相談画面へ遷移
      router.push("/consulting/start")
    } catch (error) {
      console.error("Failed to save analysis result:", error)
      // フォールバック: 通常の遷移
      router.push("/consulting/start")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダーはConditionalHeaderで表示 */}

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ページタイトル */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-blue-100">
              <Globe className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Webサイト分析</h1>
              {companyName && companyUrl && (
                <p className="text-sm text-gray-600">
                  {companyName} -{" "}
                  <a
                    href={companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {companyUrl}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="rounded border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
            <p className="text-lg font-medium text-gray-900">会社情報を取得中...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex items-start gap-4 rounded border border-red-200 bg-red-50 p-6">
            <AlertTriangle className="mt-0.5 h-6 w-6 text-red-600" />
            <div>
              <p className="text-lg font-medium text-red-800">エラー</p>
              <p className="text-red-700">{error}</p>
              {error.includes("設定画面") && (
                <button
                  onClick={() => router.push("/dashboard/settings")}
                  className="mt-4 rounded-sm bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                >
                  設定画面へ
                </button>
              )}
            </div>
          </div>
        )}

        {/* Ready to Analyze - ボタン表示（結果がない時） */}
        {!isLoading && !error && !result && !isAnalyzing && companyUrl && (
          <div className="rounded border border-gray-200 bg-white p-8 text-center shadow-sm">
            <Globe className="mx-auto mb-4 h-16 w-16 text-blue-600" />
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Webサイト分析の準備ができました
            </h2>
            <p className="mb-6 text-gray-600">
              {companyName}のWebサイト（{companyUrl}）を分析します。
              <br />
              Google PageSpeed
              Insightsを使用して、パフォーマンス、SEO、セキュリティなどを診断します。
            </p>
            <button
              onClick={runAnalysis}
              className="inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
            >
              <Play className="h-4 w-4" />
              Webサイト分析を開始
            </button>
          </div>
        )}

        {/* Analyzing State */}
        {isAnalyzing && <AnalysisSteps steps={analysisSteps} currentStep={currentStep} />}

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
