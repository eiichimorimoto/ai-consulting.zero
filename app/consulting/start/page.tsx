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
import { ArrowRight, BarChart3, CheckCircle2, FileText, Lightbulb, MessageSquare, Send, Target, TrendingDown, DollarSign, Rocket, Users, Edit3, Cpu, Shield, Cloud, Zap, X, Paperclip, Mic, MicOff } from "lucide-react";
import { useState, useMemo, useRef, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { celebrateStepCompletion } from "@/lib/utils/confetti";
import { STEP_STATUS, CHAT, BUTTON } from "@/lib/consulting-ui-tokens";
import { useConsultingSession } from "@/hooks/useConsultingSession";
import { useMessageHandlers } from "@/hooks/useMessageHandlers";
import { useFileAttachment } from "@/hooks/useFileAttachment";

/** 既存顧客用: APIのセッション一覧をSessionDataに変換。直近をタブに、全件を履歴に */
function mapApiSessionsToSessionData(apiSessions: ApiSession[]): SessionData[] {
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
    const steps: ConsultingStep[] = [
      { id: 1, title: "課題のヒアリング", icon: <MessageSquare className="w-5 h-5" />, status: currentRound >= 1 ? "completed" : currentRound === 0 ? "active" : "pending" },
      { id: 2, title: "現状分析", icon: <BarChart3 className="w-5 h-5" />, status: currentRound >= 2 ? "completed" : currentRound === 1 ? "active" : "pending" },
      { id: 3, title: "解決策の提案", icon: <Lightbulb className="w-5 h-5" />, status: currentRound >= 3 ? "completed" : currentRound === 2 ? "active" : "pending" },
      { id: 4, title: "実行計画の策定", icon: <Target className="w-5 h-5" />, status: currentRound >= 4 ? "completed" : currentRound === 3 ? "active" : "pending" },
      { id: 5, title: "レポート作成", icon: <FileText className="w-5 h-5" />, status: currentRound >= 5 ? "completed" : currentRound === 4 ? "active" : "pending" },
    ];
    return {
      id: api.id,
      name: api.title || "相談",
      progress,
      currentStepId: Math.min(currentRound + 1, maxRounds),
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
    };
  });
}

/** 新規登録者用: ラベル1つ・進捗0%・左全て初期状態の1セッションのみ */
function createInitialSessionForNewUser(): SessionData {
  const now = new Date();
  return {
    id: "new-session",
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
  // カスタムhook: セッション管理
  const session = useConsultingSession({
    onInputValueChange: (value) => {
      // inputValueの変更通知用（messageハンドラーと連携）
    },
    createInitialSessionForNewUser,
    mapApiSessionsToSessionData,
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
    attachedFiles: file.attachedFiles,
    clearFiles: file.clearFiles,
    resetTranscript,
  });

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
  }, [transcript, message]);

  // Show voice error as toast
  useEffect(() => {
    if (voiceError) {
      toast.error("音声エラー", { description: voiceError });
    }
  }, [voiceError]);

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

  const iconMap: Record<string, React.ElementType> = {
    TrendingDown,
    DollarSign,
    Rocket,
    Users,
    Edit3,
    Cpu,
    Shield,
    Cloud,
    Zap
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F9FA]">
      {/* ラベル行: userChoice===null はラベル表示なし（新規/既存のみ）。それ以外はタブ（既存時は直近4つ）＋履歴 */}
      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm items-stretch">
        <div className="w-80 flex-shrink-0 flex gap-2 p-2 items-center">
          <button
            type="button"
            onClick={session.userChoice === null ? session.handleChoiceNew : session.handleNewSession}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl font-semibold text-emerald-700 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 shadow-sm hover:shadow text-sm min-h-[44px] transition-all duration-200"
          >
            <span>新規</span>
          </button>
          <button
            type="button"
            onClick={session.userChoice === null ? session.handleChoiceExisting : () => (session.userChoice === "existing" ? session.setIsHistoryOpen(true) : session.handleChoiceExisting())}
            disabled={session.isExistingLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl font-semibold text-indigo-700 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 shadow-sm hover:shadow text-sm min-h-[44px] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {session.isExistingLoading ? <span className="text-sm">読込中...</span> : <span>既存</span>}
          </button>
        </div>
        {session.userChoice !== null && (
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

      {/* Step Navigation Confirmation Dialog（背景・文字・ボタンを明示して見やすく） */}
      <AlertDialog open={session.stepToNavigate !== null} onOpenChange={() => session.setStepToNavigate(null)}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-slate-100 text-lg font-semibold">
              ステップに戻りますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
              STEP {session.stepToNavigate} に戻ると、現在の進捗が変更されます。よろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={session.confirmStepNavigation}
              className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
            >
              戻る
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Session Confirmation Dialog（背景・文字を明示して透明化を防止） */}
      <AlertDialog open={session.isEndingSession} onOpenChange={session.setIsEndingSession}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-slate-100">会話を終了しますか？</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-slate-300">
              この会話をどのように終了しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 bg-gray-50/50 dark:bg-slate-800/50" htmlFor="status-paused">
              <input
                type="radio"
                id="status-paused"
                name="session-status"
                value="paused"
                checked={session.endSessionStatus === "paused"}
                onChange={(e) => session.setEndSessionStatus(e.target.value as SessionStatus)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-slate-100">一時中断</div>
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">後で続きをやる予定です</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 bg-gray-50/50 dark:bg-slate-800/50" htmlFor="status-completed">
              <input
                type="radio"
                id="status-completed"
                name="session-status"
                value="completed"
                checked={session.endSessionStatus === "completed"}
                onChange={(e) => session.setEndSessionStatus(e.target.value as SessionStatus)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-slate-100">完了</div>
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">課題が解決しました</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 bg-gray-50/50 dark:bg-slate-800/50" htmlFor="status-cancelled">
              <input
                type="radio"
                id="status-cancelled"
                name="session-status"
                value="cancelled"
                checked={session.endSessionStatus === "cancelled"}
                onChange={(e) => session.setEndSessionStatus(e.target.value as SessionStatus)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-slate-100">中止</div>
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">この課題は不要になりました</div>
              </div>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-700 dark:text-slate-300">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={session.confirmEndSession} className="bg-red-600 hover:bg-red-700 text-white">
              終了する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Steps Navigation（画像準拠: ダークブルー/チャコール） */}
        <aside className="w-80 bg-slate-800 text-slate-100 border-r border-slate-700 flex flex-col min-h-0">
          <div className="p-6 border-b border-slate-700 flex-shrink-0">
            <h1 className="text-xl font-bold text-slate-100">{session.currentSession?.name ?? "相談"}</h1>
            <p className="text-sm text-slate-400 mt-1">構造化された対話体験</p>
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
                              : "bg-slate-100/50 border border-slate-200 cursor-not-allowed opacity-75"
                          }`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 ${step.status === "completed" ? STEP_STATUS.completedIcon : STEP_STATUS.pendingIcon}`}>
                          {step.status === "completed" ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
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
                  </Tooltip>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-700 space-y-2 flex-shrink-0">
            <Button
              variant="outline"
              className={`w-full ${BUTTON.leftPanel}`}
              size="sm"
              onClick={() => toast.info("準備中", { description: "レポートエクスポート機能は準備中です。" })}
            >
              <FileText className="w-4 h-4 mr-2" />
              レポートをエクスポート
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
          <header className="relative z-10 border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {session.currentSession?.steps?.find(s => s.status === "active")?.title || "課題のヒアリング"}
                </h2>
                <p className="text-sm text-gray-500">貴社の現状を詳しく分析しています</p>
              </div>
              <Badge variant="secondary" className="text-xs flex items-center gap-2 bg-white border border-gray-200 text-gray-700">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" aria-hidden />
                AI応答中
              </Badge>
            </div>
          </header>

          <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
            <div ref={chatScrollRef} className="max-w-3xl mx-auto space-y-6">
              {(session.currentSession?.messages ?? []).map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.type === "ai" && (
                    <div className="w-10 h-10 rounded-full bg-teal-500 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      <span className="text-white font-bold">AI</span>
                    </div>
                  )}

                  <div className={`max-w-[80%] ${message.type === "user" ? "order-2" : "order-1"}`}>
                    <div
                      className={`rounded-lg p-4 ${message.type === "user"
                          ? CHAT.userBubble
                          : CHAT.aiBubble
                        }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>

                      {message.interactive?.type === "category-buttons" && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {(message.interactive.data as CategoryData[]).map((category, idx) => {
                            const IconComponent = iconMap[category.icon];

                            return (
                              <button
                                key={idx}
                                onClick={() => message.handleQuickReply(category.label, true)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all group ${category.bgLight ?? "bg-card border-border hover:bg-accent"} hover:opacity-90`}
                              >
                                <div className={`${category.color} text-white p-2 rounded-full group-hover:scale-110 transition-transform`}>
                                  {IconComponent && <IconComponent className="w-4 h-4" />}
                                </div>
                                <span className="text-xs font-medium text-center leading-tight text-gray-900">{category.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {message.interactive?.type === "subcategory-buttons" && (
                        <div className="mt-4 space-y-2">
                          {(message.interactive.data as string[]).map((subcategory, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => message.handleQuickReply(subcategory)}
                              className="w-full justify-start text-xs"
                            >
                              <ArrowRight className="w-3 h-3 mr-2" />
                              {subcategory}
                            </Button>
                          ))}
                        </div>
                      )}

                      {message.interactive?.type === "custom-input" && (
                        <div className="mt-4">
                          <div className="flex gap-2">
                            <Input
                              placeholder="課題を入力してください..."
                              className="flex-1 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                  handleQuickReply(e.currentTarget.value);
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                if (input?.value.trim()) {
                                  handleQuickReply(input.value);
                                  input.value = "";
                                }
                              }}
                            >
                              <Send className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {message.interactive?.type === "buttons" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(message.interactive.data as string[]).map((option, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => message.handleQuickReply(option)}
                              className="text-xs"
                            >
                              {option}
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          ))}
                        </div>
                      )}

                      {message.interactive?.type === "form" && (
                        <Card className="mt-4 border-border/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">売上情報の入力</CardTitle>
                            <CardDescription className="text-xs">現状と目標を教えてください</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">現在の月間売上</label>
                              <Input placeholder="例: 12,500,000" className="text-sm" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">目標月間売上</label>
                              <Input placeholder="例: 18,000,000" className="text-sm" />
                            </div>
                            <Button size="sm" className={`w-full mt-2 ${BUTTON.primary}`}>
                              送信
                              <Send className="w-3 h-3 ml-2" />
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      {message.timestamp.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {message.type === "user" && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm">
                      U
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <footer className="relative z-10 flex-shrink-0 border-t border-gray-200 bg-white p-4">
            <div className="max-w-3xl mx-auto">
              {file.attachedFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {file.attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-accent text-accent-foreground px-3 py-1.5 rounded-md text-sm"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="text-xs truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => file.handleRemoveFile(index)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isListening && (
                <div className="mb-2 flex items-center gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">録音中...</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-500 rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 16 + 8}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      stopListening();
                      if (transcript) {
                        toast.success('音声入力を停止しました');
                      }
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    停止
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={file.fileInputRef}
                  type="file"
                  multiple
                  onChange={file.handleFileAttach}
                  className="hidden"
                />
                <Button
                  onClick={() => file.fileInputRef.current?.click()}
                  size="icon"
                  variant="outline"
                  type="button"
                  disabled={isListening}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Textarea
                  value={message.inputValue}
                  onChange={(e) => message.setInputValue(e.target.value)}
                  placeholder={isListening ? "音声入力中..." : "メッセージを入力..."}
                  className="flex-1 min-h-[80px] max-h-[200px] py-3 px-3 text-base resize-y !bg-slate-50 dark:!bg-slate-100 border-gray-200"
                  rows={3}
                  disabled={isListening}
                />
                <VoiceSettingsDialog
                  enableAICorrection={enableAICorrection}
                  onToggleAICorrection={setEnableAICorrection}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => {
                        if (isListening) {
                          stopListening();
                          if (transcript) {
                            toast.success('音声入力を停止しました');
                          }
                        } else {
                          resetTranscript();
                          setInputValue('');
                          startListening();
                          toast.info('音声入力開始', { description: '音声入力を開始しました。' });
                        }
                      }}
                      size="icon"
                      variant={isListening ? "destructive" : "outline"}
                      type="button"
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isListening ? '音声入力を停止' : '音声入力を開始'}</p>
                  </TooltipContent>
                </Tooltip>
                <Button onClick={message.handleSendMessage} size="icon" disabled={isListening} className={BUTTON.primary}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </footer>
            </>
          )}
        </main>

        {/* Right Sidebar - Dynamic Context Panel */}
        <TabbedContextPanel
          currentStep={session.currentSession?.currentStepId ?? 1}
          sessionName={session.currentSession?.name ?? "相談"}
          kpis={session.currentSession?.kpis ?? []}
          onInsertToChat={(text) => message.setInputValue(prev => prev ? `${prev}\n\n${text}` : text)}
          showDashboardPrompt={(session.currentSession?.name === "新規相談") && (session.currentSession?.progress === 0)}
        />
      </div>
    </div>
  );
}
