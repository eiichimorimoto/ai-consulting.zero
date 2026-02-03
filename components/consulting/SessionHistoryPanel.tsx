'use client';

/* Structured Dialogue Design - Session History Panel
 * Side panel for managing past consulting sessions
 * Typography: IBM Plex Sans (headings), Inter (body)
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TAB, STATUS_ICON } from "@/lib/consulting-ui-tokens";
import { Calendar, Clock, Pin, Search, Trash2, X, Pause, CheckCircle2, XCircle } from "lucide-react";
import { useState, useMemo } from "react";

export type SessionHistoryItem = {
  id: string;
  name: string;
  progress: number;
  lastUpdated: Date;
  createdAt: Date;
  isPinned: boolean;
  status: "active" | "paused" | "completed" | "cancelled";
  completedAt?: Date;
};

type SessionHistoryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionHistoryItem[];
  openSessionIds: string[];
  onOpenSession: (sessionId: string) => void;
  onTogglePin: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
};

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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paused" | "completed" | "cancelled">("all");

  // Filter sessions by search query and period
  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((session) =>
        session.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Period filter
    const now = new Date();
    if (filterPeriod !== "all") {
      filtered = filtered.filter((session) => {
        const daysDiff = Math.floor((now.getTime() - session.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
        if (filterPeriod === "today") return daysDiff === 0;
        if (filterPeriod === "week") return daysDiff <= 7;
        if (filterPeriod === "month") return daysDiff <= 30;
        return true;
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((session) => session.status === statusFilter);
    }

    return filtered;
  }, [sessions, searchQuery, filterPeriod, statusFilter]);

  // Group sessions
  const groupedSessions = useMemo(() => {
    const pinned = filteredSessions.filter((s) => s.isPinned);
    const today: SessionHistoryItem[] = [];
    const week: SessionHistoryItem[] = [];
    const month: SessionHistoryItem[] = [];
    const older: SessionHistoryItem[] = [];

    const now = new Date();
    filteredSessions.forEach((session) => {
      if (session.isPinned) return; // Already in pinned group

      const daysDiff = Math.floor((now.getTime() - session.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        today.push(session);
      } else if (daysDiff <= 7) {
        week.push(session);
      } else if (daysDiff <= 30) {
        month.push(session);
      } else {
        older.push(session);
      }
    });

    return { pinned, today, week, month, older };
  }, [filteredSessions]);

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  const SessionItem = ({ session }: { session: SessionHistoryItem }) => {
    const isOpenSession = openSessionIds.includes(session.id);
    const isPinned = session.isPinned;
    // 添付画像: ピン留めカード＝緑枠、その他＝薄いグレー枠
    const cardBorder = isPinned
      ? "border-2 border-[#66cc99] bg-white"
      : "border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50";

    return (
      <div
        className={`group p-4 rounded-lg transition-all cursor-pointer ${cardBorder}`}
        onDoubleClick={() => onOpenSession(session.id)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* ステータス: 常に表示（active / paused / completed / cancelled、未設定時は進行中として表示） */}
          {(() => {
            const status = session.status ?? "active";
            return (
              <>
                <div className="flex-shrink-0 mt-0.5" aria-hidden>
                  {status === "paused" && (
                    <span title="一時中断">
                      <Pause className={`w-4 h-4 ${STATUS_ICON.paused}`} />
                    </span>
                  )}
                  {status === "completed" && (
                    <span title="完了">
                      <CheckCircle2 className={`w-4 h-4 ${STATUS_ICON.completed}`} />
                    </span>
                  )}
                  {status === "cancelled" && (
                    <span title="中止">
                      <XCircle className={`w-4 h-4 ${STATUS_ICON.cancelled}`} />
                    </span>
                  )}
                  {status === "active" && <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" title="進行中" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingSessionId === session.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => {
                          if (editingName.trim() && editingName !== session.name) {
                            onRenameSession(session.id, editingName.trim());
                          }
                          setEditingSessionId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (editingName.trim() && editingName !== session.name) {
                              onRenameSession(session.id, editingName.trim());
                            }
                            setEditingSessionId(null);
                          } else if (e.key === "Escape") {
                            setEditingSessionId(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="text-sm font-semibold bg-white border border-gray-300 rounded px-2 py-0.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#66cc99]"
                      />
                    ) : (
                      <h4
                        className="text-sm font-semibold truncate cursor-text text-gray-900"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.id);
                          setEditingName(session.name);
                        }}
                      >
                        {session.name}
                      </h4>
                    )}
                    {isOpenSession && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[#e6faed] text-[#0a6e2e]">
                        開いています
                      </span>
                    )}
                    {status === "active" && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-[#e6faed] text-[#0a6e2e]">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" aria-hidden />
                        進行中
                      </span>
                    )}
                    {status === "paused" && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-[#fff3e0] text-[#b35a00]">
                        <Pause className="w-3 h-3" />
                        一時中断
                      </span>
                    )}
                    {status === "completed" && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-[#e6faed] text-[#0a6e2e]">
                        <CheckCircle2 className="w-3 h-3" />
                        完了
                      </span>
                    )}
                    {status === "cancelled" && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                        <XCircle className="w-3 h-3" />
                        中止
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(session.id);
            }}
            className={`flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors ${
              session.isPinned ? "text-[#ffd700]" : "text-gray-400 opacity-0 group-hover:opacity-100"
            }`}
          >
            <Pin className={`w-4 h-4 ${session.isPinned ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Progress
              value={session.progress}
              className={`h-2 flex-1 rounded-full ${TAB.progressTrack}`}
              indicatorClassName={TAB.progressIndicator}
            />
            <span className="text-xs font-mono text-gray-600">{session.progress}%</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>{formatLastUpdated(session.lastUpdated)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span>{session.createdAt.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSession(session.id);
            }}
          >
            タブで開く
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSession(session.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5 text-[#e74c3c]" />
          </Button>
        </div>
      </div>
    );
  };

  const SessionGroup = ({ title, sessions: groupSessions, icon: Icon }: { title: string; sessions: SessionHistoryItem[]; icon?: "pin" | "calendar" }) => {
    if (groupSessions.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3 px-2 flex items-center gap-2">
          {Icon === "pin" ? (
            <Pin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          ) : (
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          )}
          {title}
        </h3>
        <div className="space-y-2">
          {groupSessions.map((session) => (
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay（背後を暗くしてパネルを前面に） */}
      <div
        className="fixed inset-0 z-40 animate-in fade-in duration-200 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel（添付画像に合わせた色：白基調・緑アクセント・グレー） */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[400px] z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200 shadow-xl bg-white"
        role="dialog"
        aria-labelledby="session-history-title"
      >
        {/* Header（白／薄いグレー、タイトル・閉じる＝黒） */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-[#fafafa]">
          <div className="flex items-center justify-between mb-4">
            <h2 id="session-history-title" className="text-lg font-bold text-gray-900">
              相談履歴
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-200 text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search（白背景・薄いグレー枠・プレースホルダー薄いグレー） */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="セッション名やキーワードで検索..."
              className="pl-9 h-9 text-sm bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Filters（アクティブ＝濃い緑・白文字、非アクティブ＝薄いグレー・濃いグレー文字） */}
          <div className="space-y-2 mt-3">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "すべて" },
                { value: "today", label: "今日" },
                { value: "week", label: "今週" },
                { value: "month", label: "今月" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterPeriod(filter.value as "all" | "today" | "week" | "month")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    filterPeriod === filter.value
                      ? "bg-[#2ecc71] text-white border-[#2ecc71]"
                      : "bg-[#f2f2f2] text-gray-700 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "すべて" },
                { value: "paused", label: "一時中断" },
                { value: "completed", label: "完了" },
                { value: "cancelled", label: "中止" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as "all" | "paused" | "completed" | "cancelled")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    statusFilter === filter.value
                      ? "bg-[#2ecc71] text-white border-[#2ecc71]"
                      : "bg-[#f2f2f2] text-gray-700 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content（白背景） */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 bg-white min-h-full">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-600 dark:text-slate-400">該当する相談が見つかりませんでした</p>
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
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-[#f2f2f2]">
          <p className="text-xs text-gray-600 text-center">
            全 {sessions.length} 件の相談
          </p>
        </div>
      </div>
    </>
  );
}
