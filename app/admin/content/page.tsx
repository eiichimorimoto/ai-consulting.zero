"use client"

import { useState, useEffect, useCallback } from "react"
import {
  MessageSquare,
  FileText,
  Clock,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  History,
} from "lucide-react"

// ─── セッション一覧タブ ───

interface Session {
  id: string
  userId: string
  title: string
  status: string
  messageCount: number
  userName: string
  userEmail: string
  createdAt: string
  updatedAt: string
}

interface SessionsResponse {
  sessions: Session[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// ─── レポート一覧タブ ───

interface Report {
  id: string
  userId: string
  sessionId: string
  reportType: string
  status: string
  filePath: string
  userName: string
  userEmail: string
  createdAt: string
  updatedAt: string
}

interface ReportsResponse {
  reports: Report[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// ─── 操作ログタブ ───

interface ActivityLog {
  id: string
  userId: string
  actionType: string
  entityType: string
  entityId: string | null
  details: Record<string, unknown> | null
  userName: string
  userEmail: string
  createdAt: string
}

interface LogsResponse {
  logs: ActivityLog[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// ─── クリーンアップ ───

interface CleanupPreview {
  target: string
  description: string
  affectedCount: number
  retentionDays: number
  cutoffDate: string
}

type Tab = "sessions" | "reports" | "logs" | "cleanup"

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("sessions")

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "sessions", label: "セッション", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { key: "reports", label: "レポート", icon: <FileText className="h-3.5 w-3.5" /> },
    { key: "logs", label: "操作ログ", icon: <History className="h-3.5 w-3.5" /> },
    { key: "cleanup", label: "クリーンアップ", icon: <Trash2 className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">データ管理</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          セッション・レポート・操作ログの閲覧とデータクリーンアップ
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 border-b-white text-blue-700 dark:text-blue-300 -mb-px"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {activeTab === "sessions" && <SessionsTab />}
      {activeTab === "reports" && <ReportsTab />}
      {activeTab === "logs" && <LogsTab />}
      {activeTab === "cleanup" && <CleanupTab />}
    </div>
  )
}

// ─── セッション一覧 ───

function SessionsTab() {
  const [data, setData] = useState<SessionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/content/sessions?${params}`)
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error("Failed to fetch sessions:", err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const statusLabels: Record<string, { label: string; style: string }> = {
    active: { label: "進行中", style: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" },
    completed: { label: "完了", style: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" },
    archived: { label: "アーカイブ", style: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" },
  }

  return (
    <div className="space-y-4">
      {/* 検索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="セッションタイトルで検索..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : !data?.sessions?.length ? (
        <EmptyState message="セッションがありません" />
      ) : (
        <div className="space-y-2">
          {data.sessions.map((s) => (
            <div key={s.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {s.title}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        statusLabels[s.status]?.style || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {statusLabels[s.status]?.label || s.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {s.userName} ({s.userEmail})
                  </p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <MessageSquare className="inline h-3 w-3 mr-1" />
                    {s.messageCount}件
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {new Date(s.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={data.pagination.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

// ─── レポート一覧 ───

function ReportsTab() {
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/admin/content/reports?${params}`)
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error("Failed to fetch reports:", err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const reportTypeLabels: Record<string, string> = {
    market_analysis: "市場分析",
    strategy_proposal: "戦略提案",
    competitive_analysis: "競合分析",
    financial_analysis: "財務分析",
  }

  const statusStyles: Record<string, { label: string; style: string }> = {
    completed: { label: "完了", style: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" },
    generating: { label: "生成中", style: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" },
    error: { label: "エラー", style: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" },
    pending: { label: "待機中", style: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300" },
  }

  return (
    <div className="space-y-4">
      {/* フィルタ */}
      <div className="flex gap-2">
        {[
          { value: "", label: "すべて" },
          { value: "completed", label: "完了" },
          { value: "generating", label: "生成中" },
          { value: "error", label: "エラー" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatusFilter(f.value)
              setPage(1)
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === f.value
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : !data?.reports?.length ? (
        <EmptyState message="レポートがありません" />
      ) : (
        <div className="space-y-2">
          {data.reports.map((r) => (
            <div key={r.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {reportTypeLabels[r.reportType] || r.reportType}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        statusStyles[r.status]?.style || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {statusStyles[r.status]?.label || r.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {r.userName} ({r.userEmail})
                  </p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-zinc-400">
                    {new Date(r.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={data.pagination.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

// ─── 操作ログ ───

function LogsTab() {
  const [data, setData] = useState<LogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" })
      const res = await fetch(`/api/admin/activity-log?${params}`)
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error("Failed to fetch logs:", err)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const actionLabels: Record<string, string> = {
    suspend_user: "サービス停止",
    restore_user: "サービス復旧",
    change_plan: "プラン変更",
    data_cleanup: "データクリーンアップ",
    retry_payment: "決済再試行",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">管理者による操作の監査証跡</p>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          更新
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : !data?.logs?.length ? (
        <EmptyState message="操作ログがありません" />
      ) : (
        <div className="space-y-2">
          {data.logs.map((log) => (
            <div key={log.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {actionLabels[log.actionType] || log.actionType}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {log.entityType}
                      {log.entityId ? ` / ${log.entityId.slice(0, 8)}...` : ""}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    実行者: {log.userName} ({log.userEmail})
                  </p>
                  {log.details && (
                    <p className="text-xs text-zinc-400 mt-1 font-mono">
                      {JSON.stringify(log.details).slice(0, 120)}
                      {JSON.stringify(log.details).length > 120 ? "..." : ""}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-zinc-400">
                    {new Date(log.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={data.pagination.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

// ─── クリーンアップ ───

function CleanupTab() {
  const [previews, setPreviews] = useState<Record<string, CleanupPreview>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [retentionDays, setRetentionDays] = useState(180)
  const [executing, setExecuting] = useState<string | null>(null)

  const targets = [
    {
      key: "old_sessions",
      label: "古い完了済みセッション",
      description: "完了ステータスで指定日数以上前のセッションを削除",
      icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
    },
    {
      key: "orphaned_reports",
      label: "エラー状態レポート",
      description: "エラーステータスで指定日数以上前のレポートを削除",
      icon: <FileText className="h-5 w-5 text-orange-500" />,
    },
    {
      key: "expired_logs",
      label: "古い操作ログ",
      description: "指定日数以上前の操作ログを削除",
      icon: <History className="h-5 w-5 text-purple-500" />,
    },
  ]

  const previewCleanup = async (target: string) => {
    setLoading(target)
    try {
      const res = await fetch("/api/admin/content/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", target, retentionDays }),
      })
      if (res.ok) {
        const data = await res.json()
        setPreviews((prev) => ({ ...prev, [target]: data }))
      }
    } catch (err) {
      console.error("Preview failed:", err)
    } finally {
      setLoading(null)
    }
  }

  const executeCleanup = async (target: string) => {
    const preview = previews[target]
    if (!preview || preview.affectedCount === 0) return

    if (
      !confirm(
        `${preview.description}を${preview.affectedCount}件削除します。この操作は取り消せません。実行しますか？`
      )
    ) {
      return
    }

    setExecuting(target)
    try {
      const res = await fetch("/api/admin/content/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", target, retentionDays }),
      })
      if (res.ok) {
        const data = await res.json()
        setPreviews((prev) => ({ ...prev, [target]: { ...data, affectedCount: 0 } }))
        alert(`${data.affectedCount}件を削除しました`)
      } else {
        const err = await res.json()
        alert(err.error || "クリーンアップに失敗しました")
      }
    } catch (err) {
      alert("エラーが発生しました")
    } finally {
      setExecuting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 保持期間設定 */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">保持期間設定</h2>
        <div className="flex items-center gap-3">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">データ保持日数:</label>
          <div className="flex gap-1">
            {[90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setRetentionDays(d)
                  setPreviews({})
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  retentionDays === d
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                {d}日
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 rounded-xl p-4">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-800">
          <p className="font-semibold mb-1">削除操作について</p>
          <p>
            クリーンアップは「プレビュー」→「実行」の2段階です。
            実行後の復旧はできません。必ずプレビューで対象件数を確認してから実行してください。
          </p>
        </div>
      </div>

      {/* クリーンアップ対象 */}
      <div className="space-y-3">
        {targets.map((t) => {
          const preview = previews[t.key]
          return (
            <div key={t.key} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                    {t.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.label}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.description}</p>
                    {preview && (
                      <p className="text-sm font-semibold mt-2">
                        {preview.affectedCount > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            {preview.affectedCount}件が対象
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">対象データなし</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => previewCleanup(t.key)}
                    disabled={loading === t.key}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                    {loading === t.key ? "確認中..." : "プレビュー"}
                  </button>
                  {preview && preview.affectedCount > 0 && (
                    <button
                      onClick={() => executeCleanup(t.key)}
                      disabled={executing === t.key}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {executing === t.key ? "実行中..." : "削除実行"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 共通コンポーネント ───

function LoadingState() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-12 text-center text-zinc-400">
      読み込み中...
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-12 text-center text-zinc-400">
      {message}
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {total}件中 {(page - 1) * limit + 1}〜{Math.min(page * limit, total)}件
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
