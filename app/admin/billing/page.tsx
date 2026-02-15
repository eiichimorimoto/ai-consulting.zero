"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Ban,
  CheckCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface PaymentFailure {
  id: string
  user_id: string
  userName: string
  userEmail: string
  stripe_invoice_id: string
  stripe_subscription_id: string
  attempt_count: number
  last_attempt_at: string
  dunning_status: string
  failure_reason: string | null
  created_at: string
}

interface FailuresResponse {
  failures: PaymentFailure[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminBillingPage() {
  const [data, setData] = useState<FailuresResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("active")
  const [page, setPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchFailures = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter,
      })
      const res = await fetch(`/api/admin/billing/payment-failures?${params}`)
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error("Failed to fetch:", err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchFailures()
  }, [fetchFailures])

  const handleSuspend = async (userId: string, action: "suspend" | "restore") => {
    if (
      !confirm(
        action === "suspend"
          ? "このユーザーのサービスを停止しますか？"
          : "このユーザーのサービスを復旧しますか？"
      )
    ) {
      return
    }

    setActionLoading(userId)
    try {
      const res = await fetch("/api/admin/billing/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      })
      if (res.ok) {
        fetchFailures()
      } else {
        const err = await res.json()
        alert(err.error || "操作に失敗しました")
      }
    } catch (err) {
      alert("エラーが発生しました")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">課金管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            決済失敗の対応とサブスクリプション管理を行います
          </p>
        </div>
        <button
          onClick={fetchFailures}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          更新
        </button>
      </div>

      {/* ステータスフィルタ */}
      <div className="flex gap-2">
        {[
          { value: "active", label: "未解決", icon: AlertTriangle },
          { value: "resolved", label: "解決済み", icon: CheckCircle },
          { value: "all", label: "すべて", icon: CreditCard },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => {
              setStatusFilter(value)
              setPage(1)
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === value
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 決済失敗リスト */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-12 text-center text-zinc-400">
            読み込み中...
          </div>
        ) : !data?.failures?.length ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-12 text-center text-zinc-400">
            {statusFilter === "active" ? "未解決の決済失敗はありません ✅" : "データがありません"}
          </div>
        ) : (
          data.failures.map((f) => (
            <div
              key={f.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <DunningBadge status={f.dunning_status} />
                    <span className="text-xs text-zinc-400">
                      試行回数: {f.attempt_count}回
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {f.userName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{f.userEmail}</p>
                  {f.failure_reason && (
                    <p className="text-xs text-red-500 mt-2">
                      エラー: {f.failure_reason}
                    </p>
                  )}
                  <p className="text-xs text-zinc-400 mt-1">
                    発生日: {new Date(f.created_at).toLocaleString("ja-JP")}
                  </p>
                </div>

                {/* アクションボタン */}
                <div className="flex flex-col gap-2 ml-4">
                  {f.dunning_status !== "resolved" && f.dunning_status !== "suspended" && (
                    <button
                      onClick={() => handleSuspend(f.user_id, "suspend")}
                      disabled={actionLoading === f.user_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg hover:bg-red-100 dark:bg-red-900 transition-colors disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      停止
                    </button>
                  )}
                  {f.dunning_status === "suspended" && (
                    <button
                      onClick={() => handleSuspend(f.user_id, "restore")}
                      disabled={actionLoading === f.user_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 rounded-lg hover:bg-green-100 dark:bg-green-900 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      復旧
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ページネーション */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {data.pagination.total}件中{" "}
            {(data.pagination.page - 1) * data.pagination.limit + 1}〜
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}件
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {page} / {data.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page >= data.pagination.totalPages}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DunningBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    retry_scheduled: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",
    final_warning: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",
    suspended: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
    resolved: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  }
  const labels: Record<string, string> = {
    retry_scheduled: "再試行予定",
    final_warning: "最終警告",
    suspended: "停止中",
    resolved: "解決済み",
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
      {labels[status] || status}
    </span>
  )
}
