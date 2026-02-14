import { RefreshCw, Smartphone, Zap, TrendingUp, CheckCircle, Shield } from "lucide-react"
import {
  getScoreColor,
  getScoreBgColor,
  getSeverityColor,
  getSeverityLabel,
  getCategoryIcon,
  getCategoryLabel,
} from "@/lib/website-analysis/helpers"

interface DiagnosisResultProps {
  result: {
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
  isAnalyzing: boolean
  onReanalyze: () => void
  onConsult: () => void
}

export default function DiagnosisResult({
  result,
  isAnalyzing,
  onReanalyze,
  onConsult,
}: DiagnosisResultProps) {
  return (
    <div className="space-y-6">
      {/* 再分析ボタン */}
      <div className="flex justify-end">
        <button
          onClick={onReanalyze}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-2 rounded-sm bg-gray-100 px-3 py-1.5 text-xs transition-colors hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
          再分析
        </button>
      </div>

      {/* Overall Score */}
      <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
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
            <div className="mt-1 text-gray-600">総合スコア</div>
          </div>
          <div className="flex-1">
            <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full ${getScoreBgColor(result.overallScore)} transition-all duration-500`}
                style={{ width: `${result.overallScore}%` }}
              ></div>
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {result.metrics && (
        <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">詳細メトリクス</h2>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-sm bg-gray-50 p-4 text-center">
              <Smartphone
                className={`mx-auto mb-2 h-8 w-8 ${getScoreColor(result.metrics.mobileScore)}`}
              />
              <div className={`text-2xl font-bold ${getScoreColor(result.metrics.mobileScore)}`}>
                {result.metrics.mobileScore}
              </div>
              <div className="text-sm text-gray-600">モバイル</div>
            </div>
            <div className="rounded-sm bg-gray-50 p-4 text-center">
              <Zap
                className={`mx-auto mb-2 h-8 w-8 ${getScoreColor(result.metrics.desktopScore)}`}
              />
              <div className={`text-2xl font-bold ${getScoreColor(result.metrics.desktopScore)}`}>
                {result.metrics.desktopScore}
              </div>
              <div className="text-sm text-gray-600">デスクトップ</div>
            </div>
            <div className="rounded-sm bg-gray-50 p-4 text-center">
              <TrendingUp
                className={`mx-auto mb-2 h-8 w-8 ${getScoreColor(result.metrics.seoScore)}`}
              />
              <div className={`text-2xl font-bold ${getScoreColor(result.metrics.seoScore)}`}>
                {result.metrics.seoScore}
              </div>
              <div className="text-sm text-gray-600">SEO</div>
            </div>
            <div className="rounded-sm bg-gray-50 p-4 text-center">
              <CheckCircle
                className={`mx-auto mb-2 h-8 w-8 ${getScoreColor(result.metrics.accessibilityScore)}`}
              />
              <div
                className={`text-2xl font-bold ${getScoreColor(result.metrics.accessibilityScore)}`}
              >
                {result.metrics.accessibilityScore}
              </div>
              <div className="text-sm text-gray-600">アクセシビリティ</div>
            </div>
          </div>

          {/* Core Web Vitals */}
          <h3 className="text-md mb-3 font-semibold text-gray-800">Core Web Vitals</h3>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-sm border border-gray-200 p-3">
              <div className="mb-1 text-xs text-gray-600">FCP (初回描画)</div>
              <div
                className={`text-lg font-bold ${result.metrics.fcp <= 1800 ? "text-green-500" : result.metrics.fcp <= 3000 ? "text-yellow-500" : "text-red-500"}`}
              >
                {(result.metrics.fcp / 1000).toFixed(2)}秒
              </div>
              <div className="text-xs text-gray-500">目標: 1.8秒以下</div>
            </div>
            <div className="rounded-sm border border-gray-200 p-3">
              <div className="mb-1 text-xs text-gray-600">LCP (最大描画)</div>
              <div
                className={`text-lg font-bold ${result.metrics.lcp <= 2500 ? "text-green-500" : result.metrics.lcp <= 4000 ? "text-yellow-500" : "text-red-500"}`}
              >
                {(result.metrics.lcp / 1000).toFixed(2)}秒
              </div>
              <div className="text-xs text-gray-500">目標: 2.5秒以下</div>
            </div>
            <div className="rounded-sm border border-gray-200 p-3">
              <div className="mb-1 text-xs text-gray-600">CLS (シフト)</div>
              <div
                className={`text-lg font-bold ${parseFloat(result.metrics.cls) <= 0.1 ? "text-green-500" : parseFloat(result.metrics.cls) <= 0.25 ? "text-yellow-500" : "text-red-500"}`}
              >
                {result.metrics.cls}
              </div>
              <div className="text-xs text-gray-500">目標: 0.1以下</div>
            </div>
            <div className="rounded-sm border border-gray-200 p-3">
              <div className="mb-1 text-xs text-gray-600">TTFB (応答)</div>
              <div
                className={`text-lg font-bold ${result.metrics.ttfb <= 600 ? "text-green-500" : result.metrics.ttfb <= 1000 ? "text-yellow-500" : "text-red-500"}`}
              >
                {(result.metrics.ttfb / 1000).toFixed(2)}秒
              </div>
              <div className="text-xs text-gray-500">目標: 0.6秒以下</div>
            </div>
            <div className="rounded-sm border border-gray-200 p-3">
              <div className="mb-1 text-xs text-gray-600">TBT (ブロック)</div>
              <div
                className={`text-lg font-bold ${result.metrics.tbt <= 200 ? "text-green-500" : result.metrics.tbt <= 600 ? "text-yellow-500" : "text-red-500"}`}
              >
                {result.metrics.tbt}ms
              </div>
              <div className="text-xs text-gray-500">目標: 200ms以下</div>
            </div>
          </div>

          {/* SSL & Mobile Friendly */}
          <div className="flex gap-4">
            <div
              className={`flex items-center gap-2 rounded-sm px-4 py-2 ${result.metrics.hasSSL ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              <Shield className="h-4 w-4" />
              SSL: {result.metrics.hasSSL ? "対応済み" : "未対応"}
            </div>
            <div
              className={`flex items-center gap-2 rounded-sm px-4 py-2 ${result.metrics.isMobileFriendly ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              <Smartphone className="h-4 w-4" />
              モバイル対応: {result.metrics.isMobileFriendly ? "良好" : "要改善"}
            </div>
          </div>
        </div>
      )}

      {/* Issues */}
      {result.topIssues && result.topIssues.length > 0 && (
        <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">検出された課題</h2>
          <div className="space-y-4">
            {result.topIssues.map((issue, index) => (
              <div
                key={index}
                className={`rounded-sm border p-4 ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getCategoryIcon(issue.category)}</div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                        {getCategoryLabel(issue.category)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          issue.severity === "high"
                            ? "bg-orange-200 text-orange-800"
                            : issue.severity === "medium"
                              ? "bg-yellow-200 text-yellow-800"
                              : issue.severity === "low"
                                ? "bg-blue-200 text-blue-800"
                                : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {getSeverityLabel(issue.severity)}
                      </span>
                    </div>
                    <div className="mb-1 text-lg font-semibold">{issue.issue}</div>
                    <p className="text-sm opacity-80">{issue.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <h2 className="mb-2 text-lg font-bold">改善のご提案</h2>
        <p className="mb-4 text-blue-100">
          検出された課題を解決することで、ユーザー体験の向上と検索順位の改善が期待できます。
          詳細な改善プランについてはお問い合わせください。
        </p>
        <button
          onClick={onConsult}
          className="rounded-sm bg-white px-6 py-2 font-semibold text-blue-600 transition-colors hover:bg-blue-50"
        >
          改善について相談する
        </button>
      </div>
    </div>
  )
}
