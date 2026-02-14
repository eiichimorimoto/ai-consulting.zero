"use client"

import { useState, useRef } from "react"
import { Download, AlertTriangle, CheckCircle, TrendingUp, Mail } from "lucide-react"
import Link from "next/link"

export interface ReportData {
  id: string
  email: string
  company_name: string
  url: string
  overall_score: number
  top_issues: Array<{
    category: string
    severity: string
    issue: string
    impact: string
  }>
  metrics: {
    mobileScore: number
    desktopScore: number
    seoScore: number
    accessibilityScore: number
    hasSSL: boolean
    isMobileFriendly: boolean
    fcp: number
    lcp: number
    cls: string
  }
  sns?: {
    twitter?: string
    facebook?: string
    instagram?: string
    youtube?: string
    linkedin?: string
    line?: string
  }
  created_at: string
}

interface DiagnosisReportClientProps {
  report: ReportData
}

export default function DiagnosisReportClient({ report }: DiagnosisReportClientProps) {
  const [downloading, setDownloading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const handleDownloadPNG = async () => {
    if (!printRef.current) return
    setDownloading(true)

    try {
      // 動的importでhtml2canvasを読み込み（初期バンドルから除外）
      const html2canvas = (await import("html2canvas")).default

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      })

      const link = document.createElement("a")
      link.download = `診断レポート_${report.company_name}_${new Date().toISOString().split("T")[0]}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "不明なエラー"
      console.error("PNG generation error:", err)
      alert("画像の生成に失敗しました: " + errorMessage)
    } finally {
      setDownloading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    if (score >= 40) return "text-orange-600"
    return "text-red-600"
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    if (score >= 40) return "bg-orange-500"
    return "bg-red-500"
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      default:
        return "bg-green-500"
    }
  }

  const getSeverityBorderColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-500"
      case "high":
        return "border-orange-500"
      case "medium":
        return "border-yellow-500"
      default:
        return "border-green-500"
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-white/70 shadow-sm backdrop-blur-2xl">
        <div className="w-full" style={{ paddingLeft: "19px", paddingRight: "19px" }}>
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="SolveWise"
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <div>
                <span className="text-lg font-bold text-gray-900">SolveWise</span>
                <p className="hidden text-xs text-gray-600 sm:block">経営課題をAIで解決</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* 新規登録メール確認のお知らせ */}
      <div className="fixed inset-x-0 top-16 z-40 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <Mail className="h-5 w-5 text-white" />
            <p className="text-sm font-medium text-white">
              新規登録メールをご確認ください。メール内のリンクをクリックして、アカウントを有効化してください。
            </p>
          </div>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="px-4 pb-16 pt-32">
        {/* ダウンロードボタン */}
        <div className="mx-auto mb-4 flex max-w-4xl justify-end">
          <button
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-5 w-5" />
            {downloading ? "ダウンロード中..." : "画像でダウンロード"}
          </button>
        </div>

        {/* 印刷用エリア */}
        <div
          ref={printRef}
          className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-lg"
          style={{ minHeight: "1100px" }}
        >
          {/* ヘッダー */}
          <div className="mb-4 border-b-2 border-blue-600 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="mb-1 text-2xl font-bold text-gray-900">Webサイト診断レポート</h1>
                <p className="font-semibold text-gray-700">{report.company_name}</p>
                <p className="text-sm text-blue-600">{report.url}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">診断日時</div>
                <div className="text-sm text-gray-700">
                  {new Date(report.created_at).toLocaleString("ja-JP")}
                </div>
              </div>
            </div>
          </div>

          {/* 総合スコア */}
          <div className="mb-4 flex items-center gap-6 rounded-lg bg-gray-50 p-4">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(report.overall_score)}`}>
                {report.overall_score}
              </div>
              <div className="mt-1 text-sm text-gray-500">総合スコア</div>
            </div>
            <div className="flex-1">
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full ${getScoreBgColor(report.overall_score)} transition-all`}
                  style={{ width: `${report.overall_score}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {report.overall_score >= 80 && "良好な状態です。細かい改善で更に向上できます。"}
                {report.overall_score >= 60 &&
                  report.overall_score < 80 &&
                  "改善の余地があります。主要な課題に対処することをお勧めします。"}
                {report.overall_score >= 40 &&
                  report.overall_score < 60 &&
                  "早急な対策が必要です。重大な課題が検出されています。"}
                {report.overall_score < 40 && "重大な問題があります。至急対応が必要です。"}
              </p>
            </div>
          </div>

          {/* スコアの見方 */}
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-bold text-blue-800">📊 スコアの見方</h3>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                <span className="text-gray-700">
                  <strong>90-100:</strong> 優秀
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-green-400"></span>
                <span className="text-gray-700">
                  <strong>80-89:</strong> 良好
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                <span className="text-gray-700">
                  <strong>60-79:</strong> 要改善
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                <span className="text-gray-700">
                  <strong>0-59:</strong> 要対策
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              ※ スコアはGoogle PageSpeed Insights基準。業界平均は <strong>モバイル: 50点</strong>、
              <strong>デスクトップ: 70点</strong> 程度です。
            </p>
          </div>

          {/* パフォーマンス指標 */}
          <div className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              パフォーマンス指標
            </h2>
            <div className="mb-3 grid grid-cols-4 gap-3">
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                <div className={`text-2xl font-bold ${getScoreColor(report.metrics.mobileScore)}`}>
                  {report.metrics.mobileScore}
                </div>
                <div className="mt-1 text-xs text-gray-500">モバイル</div>
                <div className="text-[10px] text-gray-400">業界平均: 50</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                <div className={`text-2xl font-bold ${getScoreColor(report.metrics.desktopScore)}`}>
                  {report.metrics.desktopScore}
                </div>
                <div className="mt-1 text-xs text-gray-500">デスクトップ</div>
                <div className="text-[10px] text-gray-400">業界平均: 70</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                {report.metrics.seoScore > 0 ? (
                  <>
                    <div className={`text-2xl font-bold ${getScoreColor(report.metrics.seoScore)}`}>
                      {report.metrics.seoScore}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">SEO</div>
                    <div className="text-[10px] text-gray-400">業界平均: 82</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-600">要対策</div>
                    <div className="mt-1 text-xs text-gray-500">SEO</div>
                    <div className="text-[10px] text-red-500">※未設定/取得不可</div>
                  </>
                )}
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                {report.metrics.accessibilityScore > 0 ? (
                  <>
                    <div
                      className={`text-2xl font-bold ${getScoreColor(report.metrics.accessibilityScore)}`}
                    >
                      {report.metrics.accessibilityScore}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">アクセシビリティ</div>
                    <div className="text-[10px] text-gray-400">業界平均: 78</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-600">要対策</div>
                    <div className="mt-1 text-xs text-gray-500">アクセシビリティ</div>
                    <div className="text-[10px] text-red-500">※未設定/取得不可</div>
                  </>
                )}
              </div>
            </div>

            {/* スコア詳細説明 */}
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-3">
                <h4 className="mb-1 text-sm font-bold text-purple-800">🔍 SEOスコア詳細</h4>
                <p className="text-xs text-gray-700">
                  {report.metrics.seoScore > 0 ? (
                    <>
                      検索エンジン最適化の評価。<strong>{report.metrics.seoScore}点</strong>は
                      {report.metrics.seoScore >= 90
                        ? "非常に優れた状態です。検索上位表示が期待できます。"
                        : report.metrics.seoScore >= 80
                          ? "良好です。さらなる改善で上位表示を狙えます。"
                          : report.metrics.seoScore >= 60
                            ? "改善の余地があります。メタタグやコンテンツ構造を見直しましょう。"
                            : "早急な対策が必要です。検索流入が大幅に損なわれている可能性があります。"}
                    </>
                  ) : (
                    <>
                      <strong className="text-red-600">SEO未設定または取得不可</strong>。
                      基本的なSEO対策（titleタグ、metaタグ、見出し構造）が未実装の可能性があります。
                      Google検索での上位表示は困難な状態です。
                      <span className="mt-1 block text-purple-700">
                        → メタタグ、構造化データ、サイトマップの設定を推奨します。
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-teal-50 p-3">
                <h4 className="mb-1 text-sm font-bold text-green-800">♿ アクセシビリティ詳細</h4>
                <p className="text-xs text-gray-700">
                  {report.metrics.accessibilityScore > 0 ? (
                    <>
                      障がい者・高齢者対応の評価。
                      <strong>{report.metrics.accessibilityScore}点</strong>は
                      {report.metrics.accessibilityScore >= 90
                        ? "非常に優れています。すべてのユーザーが快適に利用できます。"
                        : report.metrics.accessibilityScore >= 80
                          ? "良好です。細かい改善でより多くのユーザーに対応できます。"
                          : report.metrics.accessibilityScore >= 60
                            ? "改善が必要です。コントラストや代替テキストを確認しましょう。"
                            : "対策が必要です。多くのユーザーがアクセスしづらい状態です。"}
                    </>
                  ) : (
                    <>
                      <strong className="text-red-600">アクセシビリティ未設定または取得不可</strong>
                      。
                      画像のalt属性、コントラスト比、フォーカス管理などが未実装の可能性があります。
                      視覚障がい者や高齢者がサイトを利用しづらい状態です。
                      <span className="mt-1 block text-green-700">
                        → WCAG基準に基づいた改善を推奨します。
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  {report.metrics.hasSSL ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-700">SSL対応</span>
                </div>
                <div
                  className={`text-sm ${report.metrics.hasSSL ? "text-green-600" : "text-red-600"}`}
                >
                  {report.metrics.hasSSL ? "対応済み" : "未対応"}
                </div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  {report.metrics.isMobileFriendly ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-700">モバイル対応</span>
                </div>
                <div
                  className={`text-sm ${report.metrics.isMobileFriendly ? "text-green-600" : "text-red-600"}`}
                >
                  {report.metrics.isMobileFriendly ? "対応済み" : "改善が必要"}
                </div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="mb-1 text-sm font-semibold text-gray-700">Core Web Vitals</div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>
                      FCP:{" "}
                      <strong
                        className={
                          report.metrics.fcp <= 1800
                            ? "text-green-600"
                            : report.metrics.fcp <= 3000
                              ? "text-yellow-600"
                              : "text-red-600"
                        }
                      >
                        {(report.metrics.fcp / 1000).toFixed(2)}秒
                      </strong>
                    </span>
                    <span className="text-gray-400">(目標: 1.8秒)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      LCP:{" "}
                      <strong
                        className={
                          report.metrics.lcp <= 2500
                            ? "text-green-600"
                            : report.metrics.lcp <= 4000
                              ? "text-yellow-600"
                              : "text-red-600"
                        }
                      >
                        {(report.metrics.lcp / 1000).toFixed(2)}秒
                      </strong>
                    </span>
                    <span className="text-gray-400">(目標: 2.5秒)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      CLS:{" "}
                      <strong
                        className={
                          parseFloat(report.metrics.cls) <= 0.1
                            ? "text-green-600"
                            : parseFloat(report.metrics.cls) <= 0.25
                              ? "text-yellow-600"
                              : "text-red-600"
                        }
                      >
                        {report.metrics.cls}
                      </strong>
                    </span>
                    <span className="text-gray-400">(目標: 0.1)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 検出された課題 */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              検出された課題と改善提案
            </h2>
            <div className="space-y-3">
              {report.top_issues.map((issue, index) => {
                const categoryInfo: Record<
                  string,
                  { icon: string; recommendations: string[]; avgImpact: string }
                > = {
                  performance: {
                    icon: "⚡",
                    recommendations: [
                      "画像の最適化（WebP形式への変換、遅延読み込み）",
                      "JavaScript/CSSの圧縮・遅延読み込み",
                      "キャッシュの有効活用",
                      "サーバーレスポンス時間の短縮",
                    ],
                    avgImpact: "表示速度1秒遅延で離脱率7%増加",
                  },
                  security: {
                    icon: "🔒",
                    recommendations: [
                      "SSL証明書の導入（HTTPS化）",
                      "混合コンテンツの解消",
                      "セキュリティヘッダーの設定",
                      "脆弱性のあるライブラリの更新",
                    ],
                    avgImpact: "HTTPサイトはChromeで警告表示",
                  },
                  mobile: {
                    icon: "📱",
                    recommendations: [
                      "レスポンシブデザインの実装",
                      "タップターゲットのサイズ調整（48px以上）",
                      "ビューポートの適切な設定",
                      "フォントサイズの最適化（16px以上）",
                    ],
                    avgImpact: "モバイルユーザーは全体の70%以上",
                  },
                  seo: {
                    icon: "🔍",
                    recommendations: [
                      "メタタイトル・説明文の最適化",
                      "構造化データの実装",
                      "内部リンク構造の改善",
                      "ページ速度の改善",
                    ],
                    avgImpact: "1位と10位でクリック率は10倍の差",
                  },
                }

                const info = categoryInfo[issue.category] || {
                  icon: "📋",
                  recommendations: ["専門家にご相談ください"],
                  avgImpact: "改善により顧客体験が向上",
                }

                return (
                  <div
                    key={index}
                    className={`rounded-lg border-l-4 bg-gray-50 p-4 ${getSeverityBorderColor(issue.severity)}`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <span
                        className={`px-2 py-0.5 ${getSeverityColor(issue.severity)} rounded text-xs font-bold text-white`}
                      >
                        {issue.severity === "critical" && "重大"}
                        {issue.severity === "high" && "高"}
                        {issue.severity === "medium" && "中"}
                        {issue.severity === "low" && "低"}
                      </span>
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs uppercase text-gray-400">
                        {issue.category}
                      </span>
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-gray-900">{issue.issue}</h3>

                    <div className="mb-2 rounded border border-orange-200 bg-orange-50 p-2">
                      <p className="text-sm">
                        <span className="font-semibold text-orange-700">📉 ビジネスへの影響: </span>
                        <span className="text-gray-700">{issue.impact}</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        <span className="font-semibold">💡 参考データ: </span>
                        {info.avgImpact}
                      </p>
                    </div>

                    <div className="rounded border border-blue-200 bg-blue-50 p-2">
                      <p className="mb-1 text-xs font-semibold text-blue-800">
                        🔧 推奨される改善策:
                      </p>
                      <ul className="space-y-0.5 text-xs text-gray-700">
                        {info.recommendations.slice(0, 2).map((rec, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-blue-500">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SNS情報 */}
          {report.sns && Object.values(report.sns).some((v) => v) && (
            <div className="mt-6 rounded-lg border border-purple-200 bg-gradient-to-r from-pink-50 to-purple-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-purple-800">📱 検出されたSNSアカウント</h3>
              <div className="grid grid-cols-3 gap-2">
                {report.sns.twitter && (
                  <a
                    href={report.sns.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border bg-white p-2 transition-colors hover:bg-blue-50"
                  >
                    <span className="text-blue-400">𝕏</span>
                    <span className="truncate text-xs text-gray-600">Twitter/X</span>
                  </a>
                )}
                {report.sns.facebook && (
                  <a
                    href={report.sns.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border bg-white p-2 transition-colors hover:bg-blue-50"
                  >
                    <span className="text-blue-600">f</span>
                    <span className="truncate text-xs text-gray-600">Facebook</span>
                  </a>
                )}
                {report.sns.instagram && (
                  <a
                    href={report.sns.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border bg-white p-2 transition-colors hover:bg-pink-50"
                  >
                    <span className="text-pink-500">📷</span>
                    <span className="truncate text-xs text-gray-600">Instagram</span>
                  </a>
                )}
                {report.sns.youtube && (
                  <a
                    href={report.sns.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border bg-white p-2 transition-colors hover:bg-red-50"
                  >
                    <span className="text-red-500">▶</span>
                    <span className="truncate text-xs text-gray-600">YouTube</span>
                  </a>
                )}
                {report.sns.linkedin && (
                  <a
                    href={report.sns.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border bg-white p-2 transition-colors hover:bg-blue-50"
                  >
                    <span className="text-blue-700">in</span>
                    <span className="truncate text-xs text-gray-600">LinkedIn</span>
                  </a>
                )}
                {report.sns.line && (
                  <a
                    href={report.sns.line}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border bg-white p-2 transition-colors hover:bg-green-50"
                  >
                    <span className="text-green-500">💬</span>
                    <span className="truncate text-xs text-gray-600">LINE</span>
                  </a>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                ※ SNS連携はブランド認知度向上に効果的です。定期的な情報発信をお勧めします。
              </p>
            </div>
          )}

          {/* 改善アクションプラン */}
          <div className="mt-6 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
            <h3 className="mb-2 text-sm font-bold text-green-800">🎯 次のステップ</h3>
            <ol className="space-y-1 text-xs text-gray-700">
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">
                  1
                </span>
                <span>重大度「高」以上の課題から優先的に対応</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">
                  2
                </span>
                <span>モバイル対応を最優先（アクセスの70%以上がモバイル）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">
                  3
                </span>
                <span>1ヶ月後に再診断で改善効果を確認</span>
              </li>
            </ol>
          </div>

          {/* 注意事項 */}
          <div className="mt-6 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-amber-900">
              <span className="text-xl">⚠️</span>
              診断結果に関する重要な注意事項
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-white p-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                  ①
                </span>
                <div>
                  <div className="mb-1 text-sm font-bold text-gray-800">📅 診断時点の状況</div>
                  <div className="text-xs text-gray-600">
                    本診断結果は、診断実施時点でのサイト状況を反映しています。時間経過により状況が変わる場合があります。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-white p-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  ②
                </span>
                <div>
                  <div className="mb-1 text-sm font-bold text-gray-800">🌐 外部要因による変動</div>
                  <div className="text-xs text-gray-600">
                    ネットワーク速度、サーバー負荷、診断元の地域・時間帯などにより、スコアが変動する場合があります。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-white p-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                  ③
                </span>
                <div>
                  <div className="mb-1 text-sm font-bold text-gray-800">🔄 推奨：複数回診断</div>
                  <div className="text-xs text-gray-600">
                    より正確な評価のため、異なる時間帯での再診断をお勧めします。平均的な傾向を把握できます。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-white p-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  ④
                </span>
                <div>
                  <div className="mb-1 text-sm font-bold text-gray-800">🚫 スコア0の場合</div>
                  <div className="text-xs text-gray-600">
                    対象サイトの設定（robots.txt）、アクセス制限、ファイアウォール設定が原因の可能性があります。サイト管理者に確認してください。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
