'use client';

/* Structured Dialogue Design - Session Tabs
 * 添付画像準拠: アクティブは下に太線（黒塗りしない）、進捗バー見える、ステータスアイコン常時表示
 */

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TAB, BUTTON, STATUS_ICON } from "@/lib/consulting-ui-tokens";
import { X, Plus, FolderOpen, Pause, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

export type Session = {
  id: string;
  name: string;
  progress: number;
  lastUpdated: Date;
  isActive: boolean;
  status?: "active" | "paused" | "completed" | "cancelled";
  /** カテゴリー色（左ボーダー用クラス）例: border-l-4 border-l-red-500 */
  categoryAccent?: string;
};

type SessionTabsProps = {
  sessions: Session[];
  activeSessionId: string;
  onSessionChange: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void;
  onNewSession: () => void;
  onOpenHistory: () => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  /** 親で枠を描く場合に true（二重枠を防ぐ） */
  noBorder?: boolean;
};

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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleDoubleClick = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  const handleSaveName = (sessionId: string) => {
    if (editingName.trim() && editingName !== sessions.find(s => s.id === sessionId)?.name) {
      onRenameSession(sessionId, editingName.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
  };

  const getTabClasses = (session: Session) => {
    const isActive = session.id === activeSessionId;
    if (isActive) return TAB.active;
    if (session.status === "paused") return TAB.inactivePaused;
    if (session.status === "completed") return TAB.inactiveCompleted;
    if (session.status === "cancelled") return TAB.inactiveCancelled;
    return TAB.inactive;
  };

  return (
    <div className={noBorder ? "bg-white" : "border-b border-gray-200 bg-white"}>
      <div className="flex items-center gap-1 px-4 pt-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSessionChange(session.id)}
            className={`group relative flex items-center gap-2 px-4 py-2.5 transition-all duration-200 min-w-[180px] max-w-[220px] ${getTabClasses(session)}`}
          >
            {/* カテゴリー色: 左端のアクセント（指定時のみ） */}
            {session.categoryAccent && (
              <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${session.categoryAccent}`} aria-hidden />
            )}
            {/* Tab content */}
            <div className="flex-1 min-w-0 text-left relative z-0">
              <div className="flex items-center gap-2">
                {/* ステータスアイコン: 常に表示（完了/中断/中止が分かる） */}
                {/* 相談の種類: 一時中断・完了・中止の3種類でアイコン＋ラベル */}
                {session.status === "paused" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-shrink-0 flex items-center gap-1">
                        <Pause className={`w-4 h-4 ${STATUS_ICON.paused}`} />
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
                      <span className="flex-shrink-0 flex items-center gap-1">
                        <CheckCircle2 className={`w-4 h-4 ${STATUS_ICON.completed}`} />
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
                      <span className="flex-shrink-0 flex items-center gap-1">
                        <XCircle className={`w-4 h-4 ${STATUS_ICON.cancelled}`} />
                        <span className="text-xs font-medium text-gray-600">中止</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">中止: この課題は不要になりました</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {session.status === "active" && session.id !== activeSessionId && (
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" aria-hidden title="進行中" />
                )}
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleSaveName(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName(session.id);
                      else if (e.key === "Escape") handleCancelEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="text-sm font-semibold bg-white border border-gray-300 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                  />
                ) : (
                  <span
                    className="text-sm font-semibold truncate cursor-text"
                    onDoubleClick={(e) => handleDoubleClick(session, e)}
                  >
                    {session.name}
                  </span>
                )}
              </div>
              {/* 進捗バー: 必ず見える高さ・緑 */}
              <div className="flex items-center gap-2 mt-1.5">
                <Progress
                  value={session.progress}
                  className={`${TAB.progressTrack} flex-1 min-w-0`}
                  indicatorClassName={TAB.progressIndicator}
                />
                <span className="text-xs font-mono text-gray-600 flex-shrink-0">{session.progress}%</span>
              </div>
            </div>

            {/* Close button */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSessionClose(session.id);
              }}
              className="flex-shrink-0 p-1 rounded hover:bg-red-100 transition-colors cursor-pointer opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4 text-gray-500 hover:text-red-600" />
            </div>
          </button>
        ))}

        {/* 新規: 見やすいボタン */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNewSession}
          className={`flex items-center gap-1.5 px-3 py-2.5 h-auto ${BUTTON.tabAction}`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">新規</span>
        </Button>

        {/* 履歴: タブで開くボタンとして見えるように */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenHistory}
          className={`flex items-center gap-1.5 px-3 py-2.5 h-auto ${BUTTON.tabAction}`}
        >
          <FolderOpen className="w-4 h-4" />
          <span className="text-sm">履歴</span>
        </Button>
      </div>
    </div>
  );
}
