"use client"

import { useRouter } from "next/navigation"

interface DiagnosisPreviewModalProps {
  data: {
    overallScore: number
    topIssues: Array<{
      category: string
      severity: string
      issue: string
      impact: string
    }>
    companyId: string | null
    reportId: string
    metrics?: any
    url?: string
  }
  onClose: () => void
}

export function DiagnosisPreviewModal({ data, onClose }: DiagnosisPreviewModalProps) {
  const router = useRouter()

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-yellow-400"
    if (score >= 40) return "text-orange-400"
    return "text-red-400"
  }

  const getScoreMessage = (score: number) => {
    if (score >= 80) return "良好です"
    if (score >= 60) return "改善の余地があります"
    if (score >= 40) return "早急な対策が必要です"
    return "重大な問題があります"
  }

  const handleViewFullReport = () => {
    // 診断データをsessionStorageに保存
    const diagnosisData = {
      overallScore: data.overallScore,
      topIssues: data.topIssues,
      metrics: data.metrics,
      url: data.url,
      savedAt: new Date().toISOString(),
    }
    sessionStorage.setItem("pendingDiagnosis", JSON.stringify(diagnosisData))

    // サインアップページへリダイレクト
    router.push("/auth/sign-up?from=diagnosis")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
        {/* ヘッダー */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-white">診断結果が出ました</h2>
              <p className="text-sm text-gray-400">あなたのWebサイトの健康状態を分析しました</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        </div>

        {/* 総合スコア */}
        <div className="border-b border-white/10 p-6 text-center">
          <div className="inline-block">
            <div className={`mb-2 text-6xl font-bold ${getScoreColor(data.overallScore)}`}>
              {data.overallScore}
              <span className="text-2xl text-gray-400">/100</span>
            </div>
            <div className="text-gray-300">{getScoreMessage(data.overallScore)}</div>
          </div>
        </div>

        {/* 重大な課題 */}
        <div className="p-6">
          <h3 className="mb-4 text-lg font-bold text-white">⚠️ 検出された重大な課題（上位3つ）</h3>
          <div className="space-y-3">
            {data.topIssues.slice(0, 3).map((issue, index) => (
              <div key={index} className="rounded-lg border-l-4 border-red-500 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-red-500 px-2 py-1 text-xs font-bold text-white">
                    {issue.severity}
                  </span>
                  <span className="text-sm text-gray-400">{issue.category}</span>
                </div>
                <p className="mb-1 font-semibold text-white">{issue.issue}</p>
                <p className="text-sm text-gray-400">💰 {issue.impact}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white/5 p-6">
          <div className="mb-4 text-center">
            <p className="mb-2 text-sm text-gray-300">これは診断結果の一部です</p>
            <p className="font-semibold text-white">完全な診断レポート・改善提案を無料で受け取る</p>
          </div>
          <button
            onClick={handleViewFullReport}
            className="w-full rounded-lg bg-blue-600 py-4 font-bold text-white transition-colors hover:bg-blue-700"
          >
            完全な診断レポートを見る（無料）
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">アカウント作成が必要です（無料）</p>
        </div>
      </div>
    </div>
  )
}
