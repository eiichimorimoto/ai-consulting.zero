"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronDown, Loader2, AlertTriangle, BarChart2, CheckCircle2, Circle } from "lucide-react"

interface DiagnosisResult {
  overallScore: number
  topIssues: Array<{
    category: string
    severity: string
    issue: string
    impact: string
  }>
  metrics: any
  url: string
}

export default function FloatingDiagnosis() {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()
  const pathname = usePathname()

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

  // 分析中のステップ進行
  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStep(0)
      return
    }

    let stepIndex = 0
    const advanceStep = () => {
      if (stepIndex < analysisSteps.length - 1) {
        stepIndex++
        setCurrentStep(stepIndex)
      }
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

  // ダッシュボード、管理画面、認証ページ、診断ページ、相談ページ、アカウント管理ページでは非表示
  const hiddenPaths = ["/dashboard", "/admin", "/auth/", "/diagnosis/", "/consulting", "/account"]
  const shouldHide = hiddenPaths.some((path) => pathname.startsWith(path))

  if (shouldHide) return null

  const handleAnalyze = async () => {
    if (!url) return
    setIsAnalyzing(true)
    setError(null)
    setDiagnosisResult(null)

    try {
      const response = await fetch("/api/diagnose-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "分析に失敗しました")
      }

      // 診断結果を表示
      setDiagnosisResult({
        overallScore: result.data.overallScore,
        topIssues: result.data.topIssues,
        metrics: result.data.metrics,
        url: result.data.url,
      })
    } catch (err: any) {
      console.error("Analysis error:", err)
      let errorMessage = err.message || "分析中にエラーが発生しました"

      // PageSpeed APIキーが設定されていない場合の特別なメッセージ
      if (
        errorMessage.includes("PageSpeed APIキー") ||
        errorMessage.includes("PageSpeed API key")
      ) {
        errorMessage = "PageSpeed APIキーが設定されていません。管理者にお問い合わせください。"
      }

      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleViewFullReport = () => {
    if (!diagnosisResult) return

    // 診断データをsessionStorageに保存
    const diagnosisData = {
      overallScore: diagnosisResult.overallScore,
      topIssues: diagnosisResult.topIssues,
      metrics: diagnosisResult.metrics,
      url: diagnosisResult.url,
      savedAt: new Date().toISOString(),
    }
    sessionStorage.setItem("pendingDiagnosis", JSON.stringify(diagnosisData))

    // サインアップページへリダイレクト
    router.push("/auth/sign-up?from=diagnosis")
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  const handleReset = () => {
    setDiagnosisResult(null)
    setUrl("")
    setError(null)
  }

  return (
    <>
      {/* フローティングボタン（閉じている時） */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex animate-pulse items-center gap-3 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:scale-105 hover:animate-none hover:shadow-2xl"
        >
          <BarChart2 className="h-6 w-6" />
          <span>AI無料診断スタート</span>
        </button>
      )}

      {/* フローティングパネル（開いている時） */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 max-h-[80vh] w-80 overflow-hidden overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl sm:w-96">
          {/* ヘッダー */}
          <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 px-4 py-3">
            <div className="text-white">
              <div className="text-sm font-bold">貴社Webサイトの状況診断を行います</div>
              <div className="text-xs text-red-100">30秒で課題を発見</div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false)
                handleReset()
              }}
              className="p-1 text-white/80 hover:text-white"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* 診断結果がない場合：入力フォーム */}
          {!diagnosisResult && (
            <div className="p-4">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="貴社サイトのURLを入力してください"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isAnalyzing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && url) {
                      handleAnalyze()
                    }
                  }}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={!url || isAnalyzing}
                  className="flex items-center gap-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "診断"}
                </button>
              </div>

              {isAnalyzing && (
                <div className="mt-4 rounded-xl bg-gray-50 p-3">
                  {/* 進捗バー */}
                  <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(95, ((currentStep + 1) / analysisSteps.length) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* 進捗ステップリスト */}
                  <div className="space-y-1.5">
                    {analysisSteps.map((step, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                          index < currentStep
                            ? "text-green-600"
                            : index === currentStep
                              ? "font-medium text-red-600"
                              : "text-gray-300"
                        }`}
                      >
                        {index < currentStep ? (
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                        ) : index === currentStep ? (
                          <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-red-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                        )}
                        <span>{step.label}</span>
                        {index === currentStep && (
                          <span className="ml-auto animate-pulse text-[10px] text-gray-400">
                            実行中
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 推定残り時間 */}
                  <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-2">
                    <span className="text-[10px] text-gray-400">
                      ステップ {currentStep + 1} / {analysisSteps.length}
                    </span>
                    <span className="text-[10px] font-medium text-gray-500">
                      約{Math.max(5, 30 - currentStep * 4)}秒
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <div className="mt-3 flex justify-between text-xs text-gray-400">
                <span>診断実績 7社</span>
                <span>課題発見率 100%</span>
              </div>
            </div>
          )}

          {/* 診断結果がある場合：簡易結果表示 */}
          {diagnosisResult && (
            <div className="p-4">
              {/* スコア */}
              <div className="mb-4 rounded-xl bg-gray-50 p-4 text-center">
                <div
                  className={`text-4xl font-bold ${getScoreColor(diagnosisResult.overallScore)}`}
                >
                  {diagnosisResult.overallScore}
                  <span className="text-lg text-gray-400">/100</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">総合スコア</div>
                <div className="mt-1 truncate text-xs text-gray-400">{diagnosisResult.url}</div>
              </div>

              {/* 課題プレビュー */}
              <div className="mb-4">
                <h4 className="mb-2 flex items-center gap-1 text-sm font-bold text-gray-700">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  検出された課題（上位3つ）
                </h4>
                <div className="space-y-2">
                  {diagnosisResult.topIssues.slice(0, 3).map((issue, index) => (
                    <div
                      key={index}
                      className="border-l-3 rounded-lg border-l-red-500 bg-gray-50 p-2 text-xs"
                    >
                      <div className="mb-1 flex items-center gap-1">
                        <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {issue.severity === "critical"
                            ? "重大"
                            : issue.severity === "high"
                              ? "高"
                              : "中"}
                        </span>
                        <span className="text-[10px] uppercase text-gray-400">
                          {issue.category}
                        </span>
                      </div>
                      <p className="font-medium text-gray-700">{issue.issue}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="space-y-2">
                <p className="text-center text-xs text-gray-500">
                  完全なレポートには詳細な分析と改善提案が含まれます
                </p>
                <button
                  onClick={handleViewFullReport}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:from-blue-700 hover:to-indigo-700"
                >
                  完全な診断レポートを見る（無料）
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-2 text-xs text-gray-500 transition-colors hover:text-gray-700"
                >
                  別のサイトを診断する
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
