'use client';

/* Structured Dialogue Design with Session Management
 * 3-column layout: Steps (left) | Chat (center) | Context (right)
 * Tab-based session management (max 5 tabs) with history panel
 * Interactive step navigation with summary display
 * Colors: Navy sidebar, Teal accents, Warm gray background
 * Typography: IBM Plex Sans (headings), Inter (body)
 */

import type { 
  SessionData, 
  Message, 
  ConsultingStep, 
  KPI, 
  SessionStatus, 
  CategoryData, 
  ApiSession 
} from "@/types/consulting";
import { MAX_OPEN_TABS, CATEGORY_ACCENT_MAP, SUBCATEGORY_MAP } from "@/lib/consulting/constants";
import { CONSULTING_CATEGORIES } from "@/lib/consulting/category-data";
import { createInitialSessions } from "@/lib/consulting/sample-data";
import SessionHistoryPanel, { SessionHistoryItem } from "@/components/consulting/SessionHistoryPanel";
import SessionTabs, { Session } from "@/components/consulting/SessionTabs";
import { TabbedContextPanel } from "@/components/consulting/TabbedContextPanel";
import { ConsultingProgressBar } from "@/components/consulting/ConsultingProgressBar";
import { VoiceSettingsDialog } from "@/components/consulting/VoiceSettingsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, BarChart3, CheckCircle2, FileText, Lightbulb, MessageSquare, Pause, Send, Target, TrendingDown, DollarSign, Rocket, Users, Edit3, Cpu, Shield, Cloud, Zap, X, Paperclip, Mic, MicOff } from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { celebrateStepCompletion } from "@/lib/utils/confetti";
import { STEP_STATUS, CHAT, BUTTON } from "@/lib/consulting-ui-tokens";
import { useConsultingSession } from "@/hooks/useConsultingSession";
import { useMessageHandlers } from "@/hooks/useMessageHandlers";
import { useFileAttachment } from "@/hooks/useFileAttachment";
import ChatArea from "@/components/consulting/ChatArea";
import SessionDialogs from "@/components/consulting/SessionDialogs";
import MessageInputArea from "@/components/consulting/MessageInputArea";
import ExportDialog from "@/components/consulting/ExportDialog";

/** 既存顧客用: APIのセッション一覧をSessionDataに変換。直近をタブに、全件を履歴に。
 * getMaxReachedStepId: そのセッションで一度でも進んだ最大STEP（未設定時は currentStepId 扱い）。進んでいないステップは「未実施」、戻ったステップは「一時中止」 */
function mapApiSessionsToSessionData(
  apiSessions: ApiSession[],
  getMaxReachedStepId?: (sessionId: string) => number
): SessionData[] {
  const sorted = [...apiSessions].sort((a, b) => {
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tb - ta;
  });
  const maxRounds = 5;
  return sorted.map((api, index) => {
    const currentRound = api.current_round ?? 0;
    const maxR = api.max_rounds ?? maxRounds;
    const progress = maxR > 0 ? Math.round((currentRound / maxR) * 100) : 0;
    const statusMap: Record<string, SessionStatus> = {
      active: "active",
      completed: "completed",
      archived: "paused",
      paused: "paused",
      cancelled: "cancelled",
    };
    const status = statusMap[api.status ?? "active"] ?? "active";
    const lastUpdated = api.updated_at ? new Date(api.updated_at) : new Date();
    const createdAt = api.created_at ? new Date(api.created_at) : new Date();
    const completedAt = api.completed_at ? new Date(api.completed_at) : undefined;
    const currentStepId = Math.min(currentRound + 1, maxRounds);
    // API の max_reached_round を優先（戻った後の refetch で一時中止が正しく出る）。未対応時はフロントの getMaxReachedStepId にフォールバック
    const apiMaxReachedStepId = (api.max_reached_round ?? currentRound) + 1;
    const frontMax = getMaxReachedStepId?.(api.id) ?? 0;
    const maxReachedStepId = Math.max(apiMaxReachedStepId, frontMax, currentStepId);
    const stepStatus = (stepId: number): ConsultingStep["status"] => {
      if (stepId < currentStepId) return "completed";
      if (stepId === currentStepId) return "active";
      if (stepId <= maxReachedStepId) return "paused";
      return "pending";
    };
    const steps: ConsultingStep[] = [
      { id: 1, title: "課題のヒアリング", icon: <MessageSquare className="w-5 h-5" />, status: stepStatus(1) },
      { id: 2, title: "現状分析", icon: <BarChart3 className="w-5 h-5" />, status: stepStatus(2) },
      { id: 3, title: "解決策の提案", icon: <Lightbulb className="w-5 h-5" />, status: stepStatus(3) },
      { id: 4, title: "実行計画の策定", icon: <Target className="w-5 h-5" />, status: stepStatus(4) },
      { id: 5, title: "レポート作成", icon: <FileText className="w-5 h-5" />, status: stepStatus(5) },
    ];
    return {
      id: api.id,
      name: api.title || "相談",
      progress,
      currentStepId,
      lastUpdated,
      createdAt,
      isPinned: false,
      isOpen: index < MAX_OPEN_TABS,
      status,
      messages: [],
      kpis: [
        { label: "月間売上", value: "---", change: "---", trend: "neutral" as const },
        { label: "顧客数", value: "---", change: "---", trend: "neutral" as const },
        { label: "平均単価", value: "---", change: "---", trend: "neutral" as const },
        { label: "リピート率", value: "---", change: "---", trend: "neutral" as const },
      ],
      steps,
      completedAt,
      conversationId: api.conversation_id || undefined,
    };
  });
}

/** 新規登録者用: ラベル1つ・進捗0%・左全て初期状態の1セッションのみ */
function createInitialSessionForNewUser(): SessionData {
  const now = new Date();
  const tempId = `temp-session-${Date.now()}`; // 一時ID生成
  return {
    id: tempId, // ハードコードから一時IDへ
    name: "新規相談",
    progress: 0,
    currentStepId: 1,
    lastUpdated: now,
    createdAt: now,
    isPinned: false,
    isOpen: true,
    status: "active",
    messages: [
      {
        id: 1,
        type: "ai",
        content: "こんにちは！AIコンサルティングアシスタントです。まず、貴社の現状についてお聞かせください。現在直面している主な課題は何ですか？",
        timestamp: now,
        interactive: {
          type: "category-buttons",
          data: CONSULTING_CATEGORIES
        }
      },
    ],
    kpis: [
      { label: "月間売上", value: "---", change: "---", trend: "neutral" },
      { label: "顧客数", value: "---", change: "---", trend: "neutral" },
      { label: "平均単価", value: "---", change: "---", trend: "neutral" },
      { label: "リピート率", value: "---", change: "---", trend: "neutral" },
    ],
    steps: [
      { id: 1, title: "課題のヒアリング", icon: <MessageSquare className="w-5 h-5" />, status: "active" },
      { id: 2, title: "現状分析", icon: <BarChart3 className="w-5 h-5" />, status: "pending" },
      { id: 3, title: "解決策の提案", icon: <Lightbulb className="w-5 h-5" />, status: "pending" },
      { id: 4, title: "実行計画の策定", icon: <Target className="w-5 h-5" />, status: "pending" },
      { id: 5, title: "レポート作成", icon: <FileText className="w-5 h-5" />, status: "pending" },
    ],
  };
}

/** ダッシュボードからStartに来た時の選択: 未選択 / 新規 / 既存 */
type UserChoice = null | "new" | "existing";

export default function ConsultingStartPage() {
  // エクスポートダイアログの状態
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // そのセッションで一度でも進んだ最大STEP（戻ったとき「一時中止」vs「未実施」の判定用）
  const [maxReachedStepIdBySession, setMaxReachedStepIdBySession] = useState<Map<string, number>>(() => new Map());

  const getMaxReachedStepId = useCallback((sessionId: string) => maxReachedStepIdBySession.get(sessionId) ?? 0, [maxReachedStepIdBySession]);

  const onStepCompleted = useCallback((sessionId: string, newStepId: number) => {
    setMaxReachedStepIdBySession((prev) => {
      const next = new Map(prev);
      next.set(sessionId, Math.max(next.get(sessionId) ?? 0, newStepId));
      return next;
    });
  }, []);

  // カスタムhook: セッション管理
  const session = useConsultingSession({
    onInputValueChange: (value) => {
      // inputValueの変更通知用（messageハンドラーと連携）
    },
    createInitialSessionForNewUser,
    mapApiSessionsToSessionData: (apiSessions) => mapApiSessionsToSessionData(apiSessions, getMaxReachedStepId),
    onStepCompleted,
  });

  // カスタムhook: ファイル添付
  const file = useFileAttachment();

  // Voice input（resetTranscriptが必要なため先に初期化）
  const { isListening, transcript, startListening, stopListening, resetTranscript, error: voiceError, enableAICorrection, setEnableAICorrection } = useVoiceInput();

  // カスタムhook: メッセージ処理
  const message = useMessageHandlers({
    currentSession: session.currentSession,
    activeSessionId: session.activeSessionId,
    allSessions: session.allSessions,
    setAllSessions: session.setAllSessions,
    setActiveSessionId: session.setActiveSessionId,
    attachedFiles: file.attachedFiles,
    clearFiles: file.clearFiles,
    resetTranscript,
  });

  // ページネーション状態
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);

  // ピン留めしたAI回答（セッション別）。右パネルで一覧表示・チャットで見る用
  const [pinnedBySession, setPinnedBySession] = useState<Map<string, Set<number>>>(() => new Map());
  const [scrollToMessageId, setScrollToMessageId] = useState<number | null>(null);

  const pinnedMessageIds = session.activeSessionId
    ? (pinnedBySession.get(session.activeSessionId) ?? new Set<number>())
    : new Set<number>();

  const handleTogglePin = (messageId: number) => {
    const sid = session.activeSessionId ?? "";
    setPinnedBySession((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(sid) ?? []);
      if (set.has(messageId)) set.delete(messageId);
      else set.add(messageId);
      next.set(sid, set);
      return next;
    });
  };

  const pinnedMessagesForPanel =
    session.currentSession?.messages?.filter((m) => m.type === "ai" && pinnedMessageIds.has(m.id)).map((m) => ({ id: m.id, content: m.content })) ?? [];

  // 過去のメッセージを読み込む
  const loadMoreMessages = async () => {
    if (!session.activeSessionId || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);

    try {
      const currentMessages = session.currentSession?.messages || [];
      const nextOffset = currentMessages.length;

      const res = await fetch(
        `/api/consulting/sessions/${session.activeSessionId}/messages?limit=50&offset=${nextOffset}`
      );

      if (!res.ok) throw new Error('Failed to load more messages');

      const data = await res.json();

      // 既存メッセージの前に追加（古いメッセージを上に追加）
      const updatedMessages = [...data.messages, ...currentMessages];

      // セッション更新
      session.setAllSessions(prev => prev.map(s =>
        s.id === session.activeSessionId
          ? { ...s, messages: updatedMessages }
          : s
      ));

      setTotalMessages(data.total);
      setHasMoreMessages(data.hasMore);

      toast.success(`${data.messages.length}件の過去メッセージを読み込みました`);
    } catch (error) {
      console.error('Failed to load more messages:', error);
      toast.error('メッセージの読み込みに失敗しました');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // session.handleSessionChange に inputValue クリアを連携
  const handleSessionChangeWithClear = (sessionId: string) => {
    session.handleSessionChange(sessionId);
    message.setInputValue("");
  };

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Update input value when transcript changes
  useEffect(() => {
    if (transcript) {
      message.setInputValue(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]); // message.setInputValueは安定しているため除外

  // Show voice error as toast
  useEffect(() => {
    if (voiceError) {
      toast.error("音声エラー", { description: voiceError });
    }
  }, [voiceError]);

  // activeSessionId変更時にメッセージを自動取得
  useEffect(() => {
    const activeId = session.activeSessionId;
    
    // 一時IDまたは空の場合はスキップ
    if (!activeId || activeId.startsWith('temp-session-')) {
      return;
    }

    // 既にメッセージが存在する場合はスキップ（重複取得防止）
    const currentMessages = session.currentSession?.messages || [];
    if (currentMessages.length > 0) {
      return;
    }

    // メッセージを取得
    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `/api/consulting/sessions/${activeId}/messages?limit=50&offset=0`
        );

        if (!res.ok) {
          console.error('Failed to fetch messages:', res.status);
          return;
        }

        const data = await res.json();

        // セッション更新
        session.setAllSessions(prev => prev.map(s =>
          s.id === activeId
            ? { ...s, messages: data.messages }
            : s
        ));

        setTotalMessages(data.total);
        setHasMoreMessages(data.hasMore);

        console.log('✅ Messages loaded:', {
          sessionId: activeId,
          count: data.messages.length,
          total: data.total
        });
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
  }, [session.activeSessionId, session.setAllSessions]);

  // Auto-scroll when messages change
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [session.currentSession?.messages]);

  const tabSessions: Session[] = session.displaySessions.map(s => ({
    id: s.id,
    name: s.name,
    progress: s.progress,
    lastUpdated: s.lastUpdated,
    isActive: s.id === session.activeSessionId,
    status: s.status,
    categoryAccent: CATEGORY_ACCENT_MAP[s.name],
  }));

  const historyItems: SessionHistoryItem[] = session.allSessions.map(s => ({
    id: s.id,
    name: s.name,
    progress: s.progress,
    lastUpdated: s.lastUpdated,
    createdAt: s.createdAt,
    isPinned: s.isPinned,
    status: s.status,
    completedAt: s.completedAt,
  }));

  if (session.userChoice !== null && (session.allSessions.length === 0 || !session.currentSession)) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F9FA]">
      {/* ラベル行: userChoice===null はラベル表示なし（新規/既存のみ）。それ以外はタブ（既存時は直近4つ）＋履歴 */}
      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm items-stretch">
        <div className="w-80 flex-shrink-0 flex gap-2 p-2 items-center">
          <button
            type="button"
            onClick={session.userChoice === null ? session.handleChoiceNew : session.handleNewSession}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl font-semibold text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-300 shadow-sm hover:shadow text-sm min-h-[44px] transition-all duration-200"
          >
            <span>新規</span>
          </button>
          <button
            type="button"
            onClick={session.userChoice === null ? session.handleChoiceExisting : () => (session.userChoice === "existing" ? session.setIsHistoryOpen(true) : session.handleChoiceExisting())}
            disabled={session.isExistingLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 shadow-sm hover:shadow text-sm min-h-[44px] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {session.isExistingLoading ? <span className="text-sm">読込中...</span> : <span>既存</span>}
          </button>
        </div>
        {session.userChoice === null ? (
          <div className="flex-1 flex items-center justify-start px-4">
            <p className="text-sm text-gray-600 font-medium">
              ← 新規課題を始めるか、既存課題を選択してください
            </p>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <SessionTabs
              sessions={session.userChoice === "existing" ? tabSessions.slice(0, 4) : tabSessions}
              activeSessionId={session.activeSessionId}
              onSessionChange={handleSessionChangeWithClear}
              onSessionClose={session.handleSessionClose}
              onNewSession={session.handleNewSession}
              onOpenHistory={() => session.setIsHistoryOpen(true)}
              onRenameSession={session.handleRenameSession}
              noBorder
            />
          </div>
        )}
      </div>

      {/* Session History Panel */}
      <SessionHistoryPanel
        isOpen={session.isHistoryOpen}
        onClose={() => session.setIsHistoryOpen(false)}
        sessions={historyItems}
        openSessionIds={session.openSessions.map(s => s.id)}
        onOpenSession={session.handleOpenSession}
        onTogglePin={session.handleTogglePin}
        onDeleteSession={session.handleDeleteSession}
        onRenameSession={session.handleRenameSession}
      />

      {/* Session Dialogs */}
      <SessionDialogs
        stepToNavigate={session.stepToNavigate}
        onCancelStepNavigation={() => session.setStepToNavigate(null)}
        onConfirmStepNavigation={session.confirmStepNavigation}
        isEndingSession={session.isEndingSession}
        endSessionStatus={session.endSessionStatus}
        onSetIsEndingSession={session.setIsEndingSession}
        onSetEndSessionStatus={session.setEndSessionStatus}
        onConfirmEndSession={session.confirmEndSession}
      />

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Steps Navigation（画像準拠: ダークブルー/チャコール） */}
        <aside className="w-80 flex-shrink-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white border-r border-white/10 flex flex-col min-h-0">
          <div className="p-6 border-b border-white/10 flex-shrink-0">
            <h1 className="text-xl font-bold text-white">{session.currentSession?.name ?? "相談"}</h1>
            <p className="text-sm text-white/90 mt-1">構造化された対話体験</p>
          </div>

          <div className="p-6 space-y-4 flex-shrink-0">
            <ConsultingProgressBar
              currentStep={session.currentSession?.currentStepId ?? 1}
              totalSteps={session.currentSession?.steps?.length ?? 0}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            <nav className="space-y-2 pb-6">
              {(session.currentSession?.steps ?? []).map((step, index) => {
                const isClickable = step.status === "completed";

                return (
                  <Tooltip key={step.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => session.handleStepClick(step.id)}
                        disabled={!isClickable && step.status !== "active"}
                        className={`w-full flex items-start gap-3 p-4 rounded-lg text-left transition-all ${step.status === "active"
                            ? "bg-slate-100 border border-slate-200 shadow-sm"
                            : step.status === "completed"
                              ? "bg-slate-100/90 border border-slate-200 hover:bg-slate-200 cursor-pointer"
                              : step.status === "paused"
                                ? "bg-amber-50/80 border border-amber-200 cursor-not-allowed opacity-90"
                                : "bg-slate-100/50 border border-slate-200 cursor-not-allowed opacity-75"
                          }`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 ${step.status === "completed" ? STEP_STATUS.completedIcon : step.status === "paused" ? STEP_STATUS.pausedIcon : STEP_STATUS.pendingIcon}`}>
                          {step.status === "completed" ? <CheckCircle2 className="w-5 h-5" /> : step.status === "paused" ? <Pause className="w-5 h-5" /> : step.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-gray-900 font-medium">STEP {index + 1}</span>
                            {step.status === "active" && (
                              <span className={STEP_STATUS.activeBadge}>進行中</span>
                            )}
                            {step.status === "completed" && (
                              <span className={STEP_STATUS.completedBadge}>完了</span>
                            )}
                            {step.status === "paused" && (
                              <span className={STEP_STATUS.pausedBadge}>一時中止</span>
                            )}
                            {step.status === "pending" && (
                              <span className={STEP_STATUS.pendingBadge}>未実施</span>
                            )}
                          </div>
                          <p className="font-semibold text-sm mt-1 text-gray-900">{step.title}</p>

                          {step.summary && step.summary.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {step.summary.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <div className="w-1 h-1 rounded-full bg-gray-500 mt-1.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-600 leading-relaxed">{item}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    </TooltipTrigger>
                    {step.status === "completed" && (
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-xs">クリックしてこのステップに戻る</p>
                      </TooltipContent>
                    )}
                    {step.status === "paused" && (
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-xs">前のステップに戻ったため一時中止です。現在のステップを終了すると再開できます。</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </nav>

            {session.currentSession?.steps?.some((s) => s.status === "active") && (
              <div className="px-4 pb-4">
                <Button
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10"
                  size="sm"
                  onClick={session.handleCompleteStep}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                  このステップを終了
                </Button>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 space-y-2 flex-shrink-0">
            <Button
              variant="outline"
              className={`w-full ${BUTTON.leftPanel}`}
              size="sm"
              onClick={() => setIsExportDialogOpen(true)}
              disabled={!session.currentSession}
            >
              <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="flex-1 text-left">レポートをエクスポート</span>
            </Button>
            <Button
              variant="destructive"
              className={`w-full ${BUTTON.danger}`}
              size="sm"
              onClick={session.handleEndSession}
            >
              <X className="w-4 h-4 mr-2" />
              会話を終了
            </Button>
          </div>
        </aside>

        {/* Center - Chat Area。userChoice===null は真っ新（ラベルなし・メッセージなし）。両サイドblockはそのまま */}
        <main className="relative flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)' }}>
          <div className="pointer-events-none absolute inset-0 z-0">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(99, 102, 241, 0.06) 1px, transparent 0)',
                backgroundSize: '20px 20px',
              }}
            />
            <div
              className="absolute -top-[30%] -right-[10%] w-[300px] h-[300px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08), transparent 70%)',
              }}
            />
          </div>
          {session.userChoice === null ? (
            <div className="relative z-10 flex-1 min-h-0" aria-hidden />
          ) : (
            <>
          <ChatArea
            currentSession={session.currentSession}
            chatScrollRef={chatScrollRef}
            onQuickReply={message.handleQuickReply}
            isLoading={message.isLoading}
            hasMoreMessages={hasMoreMessages}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMoreMessages}
            totalMessages={totalMessages}
            pinnedMessageIds={pinnedMessageIds}
            onTogglePin={handleTogglePin}
            scrollToMessageId={scrollToMessageId}
            onScrollToMessageDone={() => setScrollToMessageId(null)}
          />

          <MessageInputArea
            inputValue={message.inputValue}
            setInputValue={message.setInputValue}
            attachedFiles={file.attachedFiles}
            fileInputRef={file.fileInputRef}
            onFileAttach={file.handleFileAttach}
            onRemoveFile={file.handleRemoveFile}
            isListening={isListening}
            transcript={transcript}
            startListening={startListening}
            stopListening={stopListening}
            resetTranscript={resetTranscript}
            enableAICorrection={enableAICorrection}
            setEnableAICorrection={setEnableAICorrection}
            onSendMessage={message.handleSendMessage}
          />
            </>
          )}
        </main>

        {/* Right Sidebar - Dynamic Context Panel */}
        <aside className="relative flex-shrink-0 h-full">
          {session.userChoice === null && (
            <div className="absolute inset-0 bg-gray-100/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  コンテキストパネル
                </p>
                <p className="text-xs text-gray-500">
                  新規または既存を選択すると<br />利用可能になります
                </p>
              </div>
            </div>
          )}
          <TabbedContextPanel
            currentStep={session.currentSession?.currentStepId ?? 1}
            sessionName={session.currentSession?.name ?? "相談"}
            kpis={session.currentSession?.kpis ?? []}
            onInsertToChat={(text) => message.setInputValue(prev => prev ? `${prev}\n\n${text}` : text)}
            showDashboardPrompt={(session.currentSession?.name === "新規相談") && (session.currentSession?.progress === 0)}
            attachedFiles={file.attachedFiles}
            pinnedMessages={pinnedMessagesForPanel}
            onScrollToMessage={(id) => setScrollToMessageId(id)}
          />
        </aside>
      </div>

      {/* エクスポートダイアログ */}
      {isExportDialogOpen && session.currentSession && session.currentSession.id !== 'new-session' && (
        <ExportDialog
          sessionId={session.currentSession.id}
          sessionName={session.currentSession.name}
          companyName={undefined}
          userName={undefined}
          onClose={() => setIsExportDialogOpen(false)}
        />
      )}
    </div>
  );
}
