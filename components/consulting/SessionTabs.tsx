'use client';

/* Structured Dialogue Design - Session Tabs
 * Browser-like tab interface for managing multiple consulting sessions
 * Typography: IBM Plex Sans (headings), Inter (body)
 */

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Plus, FolderOpen, Pause, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

export type Session = {
  id: string;
  name: string;
  progress: number;
  lastUpdated: Date;
  isActive: boolean;
  status?: "active" | "paused" | "completed" | "cancelled";
};

type SessionTabsProps = {
  sessions: Session[];
  activeSessionId: string;
  onSessionChange: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void;
  onNewSession: () => void;
  onOpenHistory: () => void;
  onRenameSession: (sessionId: string, newName: string) => void;
};

export default function SessionTabs({
  sessions,
  activeSessionId,
  onSessionChange,
  onSessionClose,
  onNewSession,
  onOpenHistory,
  onRenameSession,
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

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center gap-1 px-4 pt-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSessionChange(session.id)}
            className={`
              group relative flex items-center gap-2 px-4 py-2.5 rounded-t-lg
              transition-all duration-200 min-w-[180px] max-w-[220px]
              ${
                session.id === activeSessionId
                  ? "bg-background text-foreground shadow-sm"
                  : session.status === "paused"
                  ? "bg-yellow-500/10 text-muted-foreground hover:bg-yellow-500/20 border border-yellow-500/20"
                  : session.status === "completed"
                  ? "bg-green-500/10 text-muted-foreground hover:bg-green-500/20 border border-green-500/20"
                  : session.status === "cancelled"
                  ? "bg-gray-500/10 text-muted-foreground hover:bg-gray-500/20 border border-gray-500/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }
            `}
          >
            {/* Active tab indicator */}
            {session.id === activeSessionId && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}

            {/* Tab content */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                {/* Status icon with tooltip */}
                {session.status === "paused" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Pause className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">一時中断: 後で続きをやる予定</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {session.status === "completed" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">完了: 課題が解決しました</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {session.status === "cancelled" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <XCircle className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">中止: この課題は不要になりました</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleSaveName(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveName(session.id);
                      } else if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="text-sm font-semibold bg-background border border-primary rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-primary"
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
              <div className="flex items-center gap-2 mt-1">
                <Progress value={session.progress} className="h-1 w-12" />
                <span className="text-xs font-mono text-muted-foreground">{session.progress}%</span>
              </div>
            </div>

            {/* Close button */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSessionClose(session.id);
              }}
              className={`
                flex-shrink-0 p-1 rounded hover:bg-destructive/10 transition-colors cursor-pointer
                ${session.id === activeSessionId ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"}
              `}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </div>
          </button>
        ))}

        {/* New session button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewSession}
          className="flex items-center gap-1.5 px-3 py-2.5 h-auto text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">新規</span>
        </Button>

        {/* History button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-3 py-2.5 h-auto text-muted-foreground hover:text-foreground"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="text-sm">履歴</span>
        </Button>
      </div>
    </div>
  );
}
