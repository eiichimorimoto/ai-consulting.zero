"use client"

/* Structured Dialogue Design - Session History Panel
 * Side panel for managing past consulting sessions
 * Typography: IBM Plex Sans (headings), Inter (body)
 */

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { TAB, STATUS_ICON } from "@/lib/consulting-ui-tokens"
import { Calendar, Clock, Pin, Search, Trash2, X, Pause, CheckCircle2, XCircle } from "lucide-react"
import { useState, useMemo } from "react"

export type SessionHistoryItem = {
  id: string
  name: string
  progress: number
  lastUpdated: Date
  createdAt: Date
  isPinned: boolean
  status: "active" | "paused" | "completed" | "cancelled"
  completedAt?: Date
}

type SessionHistoryPanelProps = {
  isOpen: boolean
  onClose: () => void
  sessions: SessionHistoryItem[]
  openSessionIds: string[]
  onOpenSession: (sessionId: string) => void
  onTogglePin: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, newName: string) => void
}

export default function SessionHistoryPanel({
  isOpen,
  onClose,
  sessions,
  openSessionIds,
  onOpenSession,
  onTogglePin,
  onDeleteSession,
  onRenameSession,
}: SessionHistoryPanelProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "week" | "month">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "paused" | "completed" | "cancelled">(
    "all"
  )

  // Filter sessions by search query and period
  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((session) =>
        session.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Period filter
    const now = new Date()
    if (filterPeriod !== "all") {
      filtered = filtered.filter((session) => {
        const daysDiff = Math.floor(
          (now.getTime() - session.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (filterPeriod === "today") return daysDiff === 0
        if (filterPeriod === "week") return daysDiff <= 7
        if (filterPeriod === "month") return daysDiff <= 30
        return true
      })
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((session) => session.status === statusFilter)
    }

    return filtered
  }, [sessions, searchQuery, filterPeriod, statusFilter])

  // Group sessions
  const groupedSessions = useMemo(() => {
    const pinned = filteredSessions.filter((s) => s.isPinned)
    const today: SessionHistoryItem[] = []
    const week: SessionHistoryItem[] = []
    const month: SessionHistoryItem[] = []
    const older: SessionHistoryItem[] = []

    const now = new Date()
    filteredSessions.forEach((session) => {
      if (session.isPinned) return // Already in pinned group

      const daysDiff = Math.floor(
        (now.getTime() - session.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysDiff === 0) {
        today.push(session)
      } else if (daysDiff <= 7) {
        week.push(session)
      } else if (daysDiff <= 30) {
        month.push(session)
      } else {
        older.push(session)
      }
    })

    return { pinned, today, week, month, older }
  }, [filteredSessions])

  const formatLastUpdated = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
  }

  const SessionItem = ({ session }: { session: SessionHistoryItem }) => {
    const isOpenSession = openSessionIds.includes(session.id)
    const isPinned = session.isPinned
    // 添付画像: ピン留めカード＝緑枠、その他＝薄いグレー枠
    const cardBorder = isPinned
      ? "border-2 border-[#66cc99] bg-white"
      : "border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"

    return (
      <div
        className={`group min-w-0 cursor-pointer overflow-visible break-words rounded-lg p-4 transition-all ${cardBorder}`}
        onClick={() => onOpenSession(session.id)}
      >
        <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
          {/* ステータス: 常に表示（active / paused / completed / cancelled、未設定時は進行中として表示） */}
          {(() => {
            const status = session.status ?? "active"
            return (
              <>
                <div className="mt-0.5 flex-shrink-0" aria-hidden>
                  {status === "paused" && (
                    <span title="一時中断">
                      <Pause className={`h-4 w-4 ${STATUS_ICON.paused}`} />
                    </span>
                  )}
                  {status === "completed" && (
                    <span title="完了">
                      <CheckCircle2 className={`h-4 w-4 ${STATUS_ICON.completed}`} />
                    </span>
                  )}
                  {status === "cancelled" && (
                    <span title="中止">
                      <XCircle className={`h-4 w-4 ${STATUS_ICON.cancelled}`} />
                    </span>
                  )}
                  {status === "active" && (
                    <span className="block h-2.5 w-2.5 rounded-full bg-blue-500" title="進行中" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {editingSessionId === session.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => {
                          if (editingName.trim() && editingName !== session.name) {
                            onRenameSession(session.id, editingName.trim())
                          }
                          setEditingSessionId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (editingName.trim() && editingName !== session.name) {
                              onRenameSession(session.id, editingName.trim())
                            }
                            setEditingSessionId(null)
                          } else if (e.key === "Escape") {
                            setEditingSessionId(null)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="rounded border border-gray-300 bg-white px-2 py-0.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#66cc99]"
                      />
                    ) : (
                      <h4
                        className="cursor-text break-words text-sm font-semibold text-gray-900"
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          setEditingSessionId(session.id)
                          setEditingName(session.name)
                        }}
                      >
                        {session.name}
                      </h4>
                    )}
                    {isOpenSession && (
                      <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        タブ表示中
                      </span>
                    )}
                    {status === "active" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
                          aria-hidden
                        />
                        進行中
                      </span>
                    )}
                    {status === "paused" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3e0] px-2 py-0.5 text-xs font-medium text-[#b35a00]">
                        <Pause className="h-3 w-3" />
                        一時中断
                      </span>
                    )}
                    {status === "completed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <CheckCircle2 className="h-3 w-3" />
                        完了
                      </span>
                    )}
                    {status === "cancelled" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        <XCircle className="h-3 w-3" />
                        中止
                      </span>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(session.id)
            }}
            className={`flex-shrink-0 rounded p-1 transition-colors hover:bg-gray-100 ${
              session.isPinned
                ? "text-[#ffd700]"
                : "text-gray-400 opacity-0 group-hover:opacity-100"
            }`}
          >
            <Pin className={`h-4 w-4 ${session.isPinned ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Progress
              value={session.progress}
              className={`h-2 flex-1 rounded-full ${TAB.progressTrack}`}
              indicatorClassName={TAB.progressIndicator}
            />
            <span className="font-mono text-xs text-gray-600">{session.progress}%</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span>{formatLastUpdated(session.lastUpdated)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span>
                {session.createdAt.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteSession(session.id)
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-[#e74c3c]" />
          </Button>
        </div>
      </div>
    )
  }

  const SessionGroup = ({
    title,
    sessions: groupSessions,
    icon: Icon,
  }: {
    title: string
    sessions: SessionHistoryItem[]
    icon?: "pin" | "calendar"
  }) => {
    if (groupSessions.length === 0) return null

    return (
      <div className="mb-6">
        <h3 className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold text-gray-700">
          {Icon === "pin" ? (
            <Pin className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
          ) : (
            <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          )}
          {title}
        </h3>
        <div className="space-y-2">
          {groupSessions.map((session) => (
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay（背後を暗くしてパネルを前面に） */}
      <div
        className="animate-in fade-in fixed inset-0 z-40 bg-black/40 duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel（添付画像に合わせた色：白基調・緑アクセント・グレー） */}
      <div
        className="animate-in slide-in-from-right fixed bottom-0 right-0 top-0 z-50 flex w-[300px] flex-col border-l border-gray-200 bg-white shadow-xl duration-300"
        role="dialog"
        aria-labelledby="session-history-title"
      >
        {/* Header（白／薄いグレー、タイトル・閉じる＝黒） */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-[#fafafa] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="session-history-title" className="text-lg font-bold text-gray-900">
              相談履歴
            </h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-900 transition-colors hover:bg-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search（白背景・薄いグレー枠・プレースホルダー薄いグレー） */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="セッション名やキーワードで検索..."
              className="h-9 border-gray-200 bg-white pl-9 text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Filters（アクティブ＝濃い青・白文字、非アクティブ＝薄いグレー・濃いグレー文字） */}
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "すべて" },
                { value: "today", label: "今日" },
                { value: "week", label: "今週" },
                { value: "month", label: "今月" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() =>
                    setFilterPeriod(filter.value as "all" | "today" | "week" | "month")
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    filterPeriod === filter.value
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-[#f2f2f2] text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "すべて" },
                { value: "paused", label: "一時中断" },
                { value: "completed", label: "完了" },
                { value: "cancelled", label: "中止" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() =>
                    setStatusFilter(filter.value as "all" | "paused" | "completed" | "cancelled")
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === filter.value
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-[#f2f2f2] text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content（白背景・枠内で折り返して全文表示） */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="min-h-full min-w-0 break-words bg-white p-6">
            {filteredSessions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  該当する相談が見つかりませんでした
                </p>
              </div>
            ) : (
              <>
                <SessionGroup title="ピン留め" sessions={groupedSessions.pinned} icon="pin" />
                {groupedSessions.pinned.length > 0 && <Separator className="my-6 bg-gray-200" />}
                <SessionGroup title="今日" sessions={groupedSessions.today} icon="calendar" />
                <SessionGroup title="今週" sessions={groupedSessions.week} icon="calendar" />
                <SessionGroup title="今月" sessions={groupedSessions.month} icon="calendar" />
                <SessionGroup title="それ以前" sessions={groupedSessions.older} icon="calendar" />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer（薄いグレー背景） */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-[#f2f2f2] p-4">
          <p className="text-center text-xs text-gray-600">全 {sessions.length} 件の相談</p>
        </div>
      </div>
    </>
  )
}
