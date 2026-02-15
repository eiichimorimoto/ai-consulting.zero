"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
} from "lucide-react"
import type { SystemHealthItem } from "@/types/admin"

interface HealthResponse {
  overall: "healthy" | "warning" | "error"
  checks: SystemHealthItem[]
  timestamp: string
}

export default function AdminSystemPage() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/system/health")
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error("Failed to fetch health:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    // 30秒間隔で自動更新
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  const overallStyles: Record<string, { bg: string; text: string; label: string }> = {
    healthy: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", label: "正常稼働中" },
    warning: { bg: "bg-yellow-50 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300", label: "警告あり" },
    error: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", label: "異常検出" },
  }

  const statusIcons: Record<string, React.ReactNode> = {
    healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">システム監視</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            外部サービスの稼働状況とシステムヘルスを監視します（30秒更新）
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          更新
        </button>
      </div>

      {/* 全体ステータスバナー */}
      {data && (
        <div
          className={`rounded-xl p-5 flex items-center gap-4 ${overallStyles[data.overall]?.bg || "bg-zinc-50 dark:bg-zinc-800"}`}
        >
          <Activity className={`h-8 w-8 ${overallStyles[data.overall]?.text || "text-zinc-600 dark:text-zinc-400"}`} />
          <div>
            <p className={`text-lg font-bold ${overallStyles[data.overall]?.text || "text-zinc-600 dark:text-zinc-400"}`}>
              {overallStyles[data.overall]?.label || "不明"}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              最終チェック: {new Date(data.timestamp).toLocaleString("ja-JP")}
            </p>
          </div>
        </div>
      )}

      {/* サービス別ステータス */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && !data ? (
          <div className="col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-12 text-center text-zinc-400">
            ヘルスチェック実行中...
          </div>
        ) : (
          data?.checks.map((check, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {statusIcons[check.status] || statusIcons.error}
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {check.service}
                  </h3>
                </div>
                {check.responseTimeMs !== undefined && (
                  <span className="text-xs text-zinc-400">
                    {check.responseTimeMs}ms
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{check.message}</p>

              {/* レスポンスタイムバー */}
              {check.responseTimeMs !== undefined && (
                <div className="mt-3">
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        check.responseTimeMs < 500
                          ? "bg-green-500"
                          : check.responseTimeMs < 2000
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (check.responseTimeMs / 5000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
