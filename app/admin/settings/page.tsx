"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Shield,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Key,
  Users,
  Lock,
  RefreshCw,
} from "lucide-react"

interface AdminMember {
  userId: string
  name: string
  email: string
  createdAt: string
  isSelf: boolean
}

interface Invitation {
  id: string
  code: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
  status: "active" | "used" | "expired"
}

export default function AdminSettingsPage() {
  // 管理者一覧
  const [members, setMembers] = useState<AdminMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  // 招待コード
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(true)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // 汎用
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // データ取得
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true)
    try {
      const res = await fetch("/api/admin/members")
      const data = await res.json()
      if (data.data) setMembers(data.data)
    } catch (err) {
      console.error("Fetch members error:", err)
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  const fetchInvitations = useCallback(async () => {
    setLoadingInvitations(true)
    try {
      const res = await fetch("/api/admin/invitations")
      const data = await res.json()
      if (data.data) setInvitations(data.data)
    } catch (err) {
      console.error("Fetch invitations error:", err)
    } finally {
      setLoadingInvitations(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
    fetchInvitations()
  }, [fetchMembers, fetchInvitations])

  // 招待コード発行
  const handleCreateInvite = async () => {
    setCreatingInvite(true)
    setActionMessage(null)
    try {
      const res = await fetch("/api/admin/invitations", { method: "POST" })
      const data = await res.json()
      if (res.ok && data.data) {
        setActionMessage({ type: "success", text: `招待コード「${data.data.code}」を発行しました` })
        fetchInvitations()
      } else {
        setActionMessage({ type: "error", text: data.error || "発行に失敗しました" })
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "招待コードの発行に失敗しました" })
    } finally {
      setCreatingInvite(false)
    }
  }

  // 招待コード取消
  const handleDeleteInvite = async (id: string) => {
    if (!confirm("この招待コードを取り消しますか？")) return
    try {
      const res = await fetch(`/api/admin/invitations?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setActionMessage({ type: "success", text: "招待コードを取り消しました" })
        fetchInvitations()
      } else {
        const data = await res.json()
        setActionMessage({ type: "error", text: data.error || "取消に失敗しました" })
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "取消に失敗しました" })
    }
  }

  // コピー
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // 管理者権限剥奪
  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`${name} の管理者権限を剥奪しますか？\nユーザーアカウントは残り、一般ユーザーになります。`)) return
    try {
      const res = await fetch(`/api/admin/members?userId=${userId}`, { method: "DELETE" })
      if (res.ok) {
        setActionMessage({ type: "success", text: `${name} の管理者権限を剥奪しました` })
        fetchMembers()
      } else {
        const data = await res.json()
        setActionMessage({ type: "error", text: data.error || "失敗しました" })
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "失敗しました" })
    }
  }

  // 管理者アカウント完全削除（アーカイブ付き）
  const handleDeleteMember = async (userId: string, name: string) => {
    if (!confirm(`⚠️ ${name} のアカウントを完全に削除しますか？\n\n関連するすべてのデータはアーカイブに保存された後に削除されます。\nこの操作は取り消せません。`)) return
    try {
      const res = await fetch(`/api/admin/members?userId=${userId}&deleteUser=true`, { method: "DELETE" })
      if (res.ok) {
        setActionMessage({ type: "success", text: `${name} のアカウントを削除しました（データはアーカイブに保存済み）` })
        fetchMembers()
      } else {
        const data = await res.json()
        setActionMessage({ type: "error", text: data.error || "削除に失敗しました" })
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "削除に失敗しました" })
    }
  }

  // パスワード変更
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "新しいパスワードが一致しません" })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "パスワードは8文字以上で入力してください" })
      return
    }

    setPasswordLoading(true)
    setPasswordMessage(null)
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setPasswordMessage({ type: "success", text: "パスワードを変更しました" })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setPasswordMessage({ type: "error", text: data.error || "変更に失敗しました" })
      }
    } catch (err) {
      setPasswordMessage({ type: "error", text: "パスワードの変更に失敗しました" })
    } finally {
      setPasswordLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">有効</span>
      case "used":
        return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-zinc-700 dark:text-zinc-300">使用済み</span>
      case "expired":
        return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">期限切れ</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* ページタイトル */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">設定</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          管理者アカウントと招待コードの管理
        </p>
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

      {/* セクション1: 管理者一覧 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">管理者一覧</h2>
          <button onClick={fetchMembers} className="ml-auto rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <RefreshCw className={`h-4 w-4 ${loadingMembers ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingMembers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-2 pr-4">名前</th>
                  <th className="pb-2 pr-4">メール</th>
                  <th className="pb-2 pr-4">登録日</th>
                  <th className="pb-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId} className="border-b border-zinc-50 dark:border-zinc-800">
                    <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {member.name}
                      {member.isSelf && (
                        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          自分
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">{member.email}</td>
                    <td className="py-3 pr-4 text-zinc-500 dark:text-zinc-500">
                      {new Date(member.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="py-3">
                      {!member.isSelf && members.length > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.name)}
                            className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                            title="管理者権限を剥奪（ユーザーは残る）"
                          >
                            <Shield className="inline h-3 w-3 mr-1" />
                            権限剥奪
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.userId, member.name)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                            title="アカウントを完全に削除（アーカイブ保存）"
                          >
                            <Trash2 className="inline h-3 w-3 mr-1" />
                            完全削除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* セクション2: 招待コード管理 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">招待コード管理</h2>
          <button
            onClick={handleCreateInvite}
            disabled={creatingInvite}
            className="ml-auto flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {creatingInvite ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            新規発行
          </button>
        </div>

        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          招待コードは発行後72時間有効で、1回のみ使用可能です。
        </p>

        {loadingInvitations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : invitations.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">招待コードはまだ発行されていません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-2 pr-4">コード</th>
                  <th className="pb-2 pr-4">ステータス</th>
                  <th className="pb-2 pr-4">有効期限</th>
                  <th className="pb-2 pr-4">発行日</th>
                  <th className="pb-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-b border-zinc-50 dark:border-zinc-800">
                    <td className="py-3 pr-4">
                      <code className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-sm font-bold tracking-wider dark:bg-zinc-800">
                        {inv.code}
                      </code>
                    </td>
                    <td className="py-3 pr-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3 pr-4 text-xs text-zinc-500 dark:text-zinc-500">
                      {new Date(inv.expiresAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-500 dark:text-zinc-500">
                      {new Date(inv.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {inv.status === "active" && (
                          <>
                            <button
                              onClick={() => handleCopy(inv.code)}
                              className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                              title="コピー"
                            >
                              {copiedCode === inv.code ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteInvite(inv.id)}
                              className="rounded p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                              title="取り消し"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* セクション3: パスワード変更 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">パスワード変更</h2>
        </div>

        <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              現在のパスワード
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              新しいパスワード（8文字以上）
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              新しいパスワード（確認）
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {passwordMessage && (
            <p
              className={`text-sm ${
                passwordMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {passwordMessage.text}
            </p>
          )}

          <button
            type="submit"
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            パスワードを変更
          </button>
        </form>
      </section>
    </div>
  )
}
