"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw, Trash2, Loader2 } from "lucide-react"
import type { AdminUser } from "@/types/admin"

interface UsersResponse {
  users: AdminUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [page, setPage] = useState(1)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (planFilter) params.set("plan", planFilter)
      if (search) params.set("search", search)

      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error("Failed to fetch users:", err)
    } finally {
      setLoading(false)
    }
  }, [page, planFilter, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ユーザー削除
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`「${name}」を完全に削除しますか？\n\n関連するすべてのデータ（相談履歴、レポート等）も削除されます。この操作は取り消せません。`)) return

    setDeletingUserId(userId)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        setActionMessage({ type: "success", text: `${name} を削除しました` })
        fetchUsers()
      } else {
        setActionMessage({ type: "error", text: data.error || "削除に失敗しました" })
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "削除に失敗しました" })
    } finally {
      setDeletingUserId(null)
    }
  }

  // 検索のデバウンス
  const [searchInput, setSearchInput] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">ユーザー管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            登録ユーザーの一覧と詳細を確認できます
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          更新
        </button>
      </div>

      {/* アクションメッセージ */}
      {actionMessage && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            actionMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* フィルター */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="名前またはメールで検索..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          {["", "free", "pro", "enterprise"].map((plan) => (
            <button
              key={plan}
              onClick={() => {
                setPlanFilter(plan)
                setPage(1)
              }}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                planFilter === plan
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              {plan === "" ? "全て" : plan.charAt(0).toUpperCase() + plan.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">ユーザー</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">会社名</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">プラン</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">ステータス</th>
                <th className="text-right px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">Chat/OCR</th>
                <th className="text-right px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">登録日</th>
                <th className="text-right px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-zinc-400">
                    読み込み中...
                  </td>
                </tr>
              ) : !data?.users?.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-zinc-400">
                    ユーザーが見つかりません
                  </td>
                </tr>
              ) : (
                data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:bg-zinc-800/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{u.name}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                      {u.companyName || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <PlanBadge plan={u.planType} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={u.appStatus || "active"} />
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {u.monthlyChatCount}/{u.monthlyOcrCount}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-500 dark:text-zinc-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.userId, u.name)}
                        disabled={deletingUserId === u.userId}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                        title="ユーザーを削除"
                      >
                        {deletingUserId === u.userId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        削除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {data && data.pagination.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.pagination.total}件中{" "}
              {(data.pagination.page - 1) * data.pagination.limit + 1}〜
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}件
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {page} / {data.pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                }
                disabled={page >= data.pagination.totalPages}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    pro: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    enterprise: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[plan] || styles.free}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
    suspended: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
    pending: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",
  }
  const labels: Record<string, string> = {
    active: "有効",
    suspended: "停止中",
    pending: "保留",
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
      {labels[status] || status}
    </span>
  )
}
