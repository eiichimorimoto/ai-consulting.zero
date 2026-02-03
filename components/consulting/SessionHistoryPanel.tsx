'use client';

/* Structured Dialogue Design - Session History Panel
 * Side panel for managing past consulting sessions
 * Typography: IBM Plex Sans (headings), Inter (body)
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

    return (
      <div
        className={`group p-4 rounded-lg border transition-all cursor-pointer ${
          isOpenSession
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        }`}
        onDoubleClick={() => onOpenSession(session.id)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
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
                  className="text-sm font-semibold bg-background border border-primary rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <h4
                  className="text-sm font-semibold truncate cursor-text"
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
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  開いています
                </Badge>
              )}
              {session.status === "paused" && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-700 border-yellow-500/20 flex items-center gap-1">
                  <Pause className="w-3 h-3" />
                  一時中断
                </Badge>
              )}
              {session.status === "completed" && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-700 border-green-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  完了
                </Badge>
              )}
              {session.status === "cancelled" && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-gray-500/10 text-gray-700 border-gray-500/20 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  中止
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(session.id);
            }}
            className={`flex-shrink-0 p-1 rounded hover:bg-accent transition-colors ${
              session.isPinned ? "text-yellow-500" : "text-muted-foreground opacity-0 group-hover:opacity-100"
            }`}
          >
            <Pin className={`w-4 h-4 ${session.isPinned ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Progress value={session.progress} className="h-1 flex-1" />
            <span className="text-xs font-mono text-muted-foreground">{session.progress}%</span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatLastUpdated(session.lastUpdated)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{session.createdAt.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs"
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
            className="h-7 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSession(session.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    );
  };

  const SessionGroup = ({ title, sessions: groupSessions }: { title: string; sessions: SessionHistoryItem[] }) => {
    if (groupSessions.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 px-2">{title}</h3>
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
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-[400px] bg-card border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">相談履歴</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="セッション名やキーワードで検索..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Filters */}
          <div className="space-y-2 mt-3">
            <div className="flex gap-2">
              {[
                { value: "all", label: "すべて" },
                { value: "today", label: "今日" },
                { value: "week", label: "今週" },
                { value: "month", label: "今月" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterPeriod(filter.value as "all" | "today" | "week" | "month")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterPeriod === filter.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {[
                { value: "all", label: "すべて" },
                { value: "paused", label: "一時中断" },
                { value: "completed", label: "完了" },
                { value: "cancelled", label: "中止" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as "all" | "paused" | "completed" | "cancelled")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === filter.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">該当する相談が見つかりませんでした</p>
            </div>
          ) : (
            <>
              <SessionGroup title="ピン留め" sessions={groupedSessions.pinned} />
              {groupedSessions.pinned.length > 0 && <Separator className="my-6" />}
              <SessionGroup title="今日" sessions={groupedSessions.today} />
              <SessionGroup title="今週" sessions={groupedSessions.week} />
              <SessionGroup title="今月" sessions={groupedSessions.month} />
              <SessionGroup title="それ以前" sessions={groupedSessions.older} />
            </>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            全 {sessions.length} 件の相談
          </p>
        </div>
      </div>
    </>
  );
}
