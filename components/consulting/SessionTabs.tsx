"use client"

/* Structured Dialogue Design - Session Tabs
 * 添付画像準拠: アクティブは下に太線（黒塗りしない）、進捗バー見える、ステータスアイコン常時表示
 */

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TAB, BUTTON, STATUS_ICON } from "@/lib/consulting-ui-tokens"
import { X, Plus, FolderOpen, Pause, CheckCircle2, XCircle } from "lucide-react"
import { useState } from "react"

export type Session = {
  id: string
  name: string
  progress: number
  lastUpdated: Date
  isActive: boolean
  status?: "active" | "paused" | "completed" | "cancelled"
  /** カテゴリー色（左ボーダー用クラス）例: border-l-4 border-l-red-500 */
  categoryAccent?: string
}

type SessionTabsProps = {
  sessions: Session[]
  activeSessionId: string
  onSessionChange: (sessionId: string) => void
  onSessionClose: (sessionId: string) => void
  onNewSession: () => void
  onOpenHistory: () => void
  onRenameSession: (sessionId: string, newName: string) => void
  /** 親で枠を描く場合に true（二重枠を防ぐ） */
  noBorder?: boolean
}

export default function SessionTabs({
  sessions,
  activeSessionId,
  onSessionChange,
  onSessionClose,
  onNewSession,
  onOpenHistory,
  onRenameSession,
  noBorder,
}: SessionTabsProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const handleDoubleClick = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSessionId(session.id)
    setEditingName(session.name)
  }

  const handleSaveName = (sessionId: string) => {
    if (editingName.trim() && editingName !== sessions.find((s) => s.id === sessionId)?.name) {
      onRenameSession(sessionId, editingName.trim())
    }
    setEditingSessionId(null)
  }

  const handleCancelEdit = () => {
    setEditingSessionId(null)
  }

  const getTabClasses = (session: Session) => {
    const isActive = session.id === activeSessionId
    if (isActive) return TAB.active
    if (session.status === "paused") return TAB.inactivePaused
    if (session.status === "completed") return TAB.inactiveCompleted
    if (session.status === "cancelled") return TAB.inactiveCancelled
    return TAB.inactive
  }

  return (
    <div className={noBorder ? "bg-white" : "border-b border-gray-200 bg-white"}>
      <div className="flex items-center gap-1 px-4 pt-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSessionChange(session.id)}
            className={`group relative flex min-w-[180px] max-w-[220px] items-center gap-2 px-4 py-2.5 transition-all duration-200 ${getTabClasses(session)}`}
          >
            {/* カテゴリー色: 左端のアクセント（指定時のみ） */}
            {session.categoryAccent && (
              <span
                className={`absolute bottom-0 left-0 top-0 w-1 rounded-l ${session.categoryAccent}`}
                aria-hidden
              />
            )}
            {/* Tab content */}
            <div className="relative z-0 min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                {/* ステータスアイコン: 常に表示（完了/中断/中止が分かる） */}
                {/* 相談の種類: 一時中断・完了・中止の3種類でアイコン＋ラベル */}
                {session.status === "paused" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex flex-shrink-0 items-center gap-1">
                        <Pause className={`h-4 w-4 ${STATUS_ICON.paused}`} />
                        <span className="text-xs font-medium text-amber-700">一時中断</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">一時中断: 後で続きをやる予定</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {session.status === "completed" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex flex-shrink-0 items-center gap-1">
                        <CheckCircle2 className={`h-4 w-4 ${STATUS_ICON.completed}`} />
                        <span className="text-xs font-medium text-blue-700">完了</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">完了: 課題が解決しました</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {session.status === "cancelled" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex flex-shrink-0 items-center gap-1">
                        <XCircle className={`h-4 w-4 ${STATUS_ICON.cancelled}`} />
                        <span className="text-xs font-medium text-gray-600">中止</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">中止: この課題は不要になりました</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {session.status === "active" && session.id !== activeSessionId && (
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
                    aria-hidden
                    title="進行中"
                  />
                )}
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleSaveName(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName(session.id)
                      else if (e.key === "Escape") handleCancelEdit()
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full rounded border border-gray-300 bg-white px-1 py-0.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                ) : (
                  <span
                    className="cursor-text truncate text-sm font-semibold"
                    onDoubleClick={(e) => handleDoubleClick(session, e)}
                  >
                    {session.name}
                  </span>
                )}
              </div>
              {/* 進捗バー: 必ず見える高さ・緑 */}
              <div className="mt-1.5 flex items-center gap-2">
                <Progress
                  value={session.progress}
                  className={`${TAB.progressTrack} min-w-0 flex-1`}
                  indicatorClassName={TAB.progressIndicator}
                />
                <span className="flex-shrink-0 font-mono text-xs text-gray-600">
                  {session.progress}%
                </span>
              </div>
            </div>

            {/* Close button */}
            <div
              onClick={(e) => {
                e.stopPropagation()
                onSessionClose(session.id)
              }}
              className="flex-shrink-0 cursor-pointer rounded p-1 opacity-70 transition-colors hover:bg-red-100 hover:opacity-100"
            >
              <X className="h-4 w-4 text-gray-500 hover:text-red-600" />
            </div>
          </button>
        ))}

        {/* 新規: 見やすいボタン */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNewSession}
          className={`flex h-auto items-center gap-1.5 px-3 py-2.5 ${BUTTON.tabAction}`}
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">新規</span>
        </Button>

        {/* 履歴: タブで開くボタンとして見えるように */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenHistory}
          className={`flex h-auto items-center gap-1.5 px-3 py-2.5 ${BUTTON.tabAction}`}
        >
          <FolderOpen className="h-4 w-4" />
          <span className="text-sm">履歴</span>
        </Button>
      </div>
    </div>
  )
}
