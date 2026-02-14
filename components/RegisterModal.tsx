"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface RegisterModalProps {
  reportId: string
  reportData?: {
    overallScore: number
    topIssues: Array<{
      category: string
      severity: string
      issue: string
      impact: string
    }>
    metrics?: any
    url?: string
  }
  onClose: () => void
}

export function RegisterModal({ reportId, reportData, onClose }: RegisterModalProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // 診断データを保存してレポートIDを取得
      const response = await fetch("/api/register-and-save-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          companyName,
          reportData: reportData || {
            overallScore: 0,
            topIssues: [],
            metrics: {},
            url: "",
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "登録に失敗しました")
      }

      if (data.success && data.reportId) {
        // 完全レポートページへ遷移
        router.push(`/diagnosis/${data.reportId}`)
      } else {
        throw new Error("レポートIDの取得に失敗しました")
      }
    } catch (err: any) {
      console.error("Registration error:", err)
      setError(err.message || "登録中にエラーが発生しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
        {/* ヘッダー */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-white">完全レポートを受け取る</h2>
              <p className="text-sm text-gray-400">メールアドレスと会社名を入力してください</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/20 p-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-300">
              メールアドレス *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-300">会社名 *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="株式会社○○"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <h4 className="mb-2 text-sm font-bold text-blue-300">完全レポートに含まれる内容：</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>✅ 詳細な課題分析（全項目）</li>
              <li>✅ パフォーマンス指標</li>
              <li>✅ Core Web Vitals分析</li>
              <li>✅ PDFダウンロード</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 py-4 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "登録中..." : "完全レポートを見る"}
          </button>

          <p className="text-center text-xs text-gray-400">
            登録することで、利用規約とプライバシーポリシーに同意したものとみなされます
          </p>
        </form>
      </div>
    </div>
  )
}
