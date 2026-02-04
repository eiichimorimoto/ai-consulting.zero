/**
 * コンサルティングセッション管理のカスタムhook
 * 
 * Start画面のセッション状態・操作ロジックを一元管理
 * 
 * @module hooks/useConsultingSession
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { SessionData, Message, SessionStatus, ApiSession } from "@/types/consulting";
import { MAX_OPEN_TABS } from "@/lib/consulting/constants";
import { CONSULTING_CATEGORIES } from "@/lib/consulting/category-data";
import { celebrateStepCompletion } from "@/lib/utils/confetti";

/** ダッシュボードからStartに来た時の選択: 未選択 / 新規 / 既存 */
export type UserChoice = null | "new" | "existing";

type UseConsultingSessionOptions = {
  onInputValueChange?: (value: string) => void;
  createInitialSessionForNewUser: () => SessionData;
  mapApiSessionsToSessionData: (apiSessions: ApiSession[]) => SessionData[];
};

/**
 * コンサルティングセッション管理のhook
 * 
 * セッションの状態管理、CRUD操作、API連携を提供
 * 
 * @param options - オプション設定
 * @returns セッション管理の状態とハンドラー
 */
export function useConsultingSession(options: UseConsultingSessionOptions) {
  const { onInputValueChange, createInitialSessionForNewUser, mapApiSessionsToSessionData } = options;

  // 状態管理
  const [userChoice, setUserChoice] = useState<UserChoice>(null);
  const [allSessions, setAllSessions] = useState<SessionData[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [sessionsLoaded, setSessionsLoaded] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExistingLoading, setIsExistingLoading] = useState(false);
  const [stepToNavigate, setStepToNavigate] = useState<number | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endSessionStatus, setEndSessionStatus] = useState<SessionStatus>("paused");

  // 算出値
  const currentSession = useMemo(
    () => allSessions.find((s) => s.id === activeSessionId) || allSessions[0],
    [allSessions, activeSessionId]
  );

  const displaySessions = useMemo(() => {
    const open = allSessions.filter((s) => s.isOpen && s.status !== "completed");

    if (open.length < MAX_OPEN_TABS) {
      const paused = allSessions
        .filter((s) => !s.isOpen && s.status === "paused")
        .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
        .slice(0, MAX_OPEN_TABS - open.length);

      return [...open, ...paused];
    }

    return open;
  }, [allSessions]);

  const openSessions = useMemo(
    () => allSessions.filter((s) => s.isOpen),
    [allSessions]
  );

  // 既存セッション（API由来）を選択したときにメッセージを取得
  useEffect(() => {
    if (!currentSession || currentSession.id === "new-session" || (currentSession?.messages?.length ?? 0) > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/consulting/sessions/${currentSession.id}/messages`);
        if (cancelled || !res.ok) return;
        const data = await res.json().catch(() => ({}));
        const list: { role: string; content: string; message_order?: number; created_at?: string }[] = data.messages || [];
        const messages: Message[] = list.map((m, i) => ({
          id: i + 1,
          type: m.role === "user" ? "user" : "ai",
          content: m.content,
          timestamp: m.created_at ? new Date(m.created_at) : new Date(),
        }));
        setAllSessions((prev) =>
          prev.map((s) =>
            s.id === currentSession.id ? { ...s, messages } : s
          )
        );
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [currentSession?.id, currentSession?.messages?.length]);

  // ステップ完了の祝福
  const previousCompletedStepsRef = useRef(0);

  useEffect(() => {
    const steps = currentSession?.steps ?? [];
    const completedSteps = steps.filter(s => s.status === 'completed').length;

    if (completedSteps > previousCompletedStepsRef.current && previousCompletedStepsRef.current > 0) {
      celebrateStepCompletion();
      toast.success('ステップ完了！おめでとうございます！');
    }

    previousCompletedStepsRef.current = completedSteps;
  }, [currentSession?.steps]);

  // ハンドラー関数

  const handleChoiceNew = () => {
    setUserChoice("new");
    const initial = createInitialSessionForNewUser();
    setAllSessions([initial]);
    setActiveSessionId(initial.id);
  };

  const handleChoiceExisting = async () => {
    setUserChoice("existing");
    setIsExistingLoading(true);
    try {
      const res = await fetch("/api/consulting/sessions");
      const data = await res.json().catch(() => ({}));
      const sessions: ApiSession[] = data.sessions || [];
      if (sessions.length === 0) {
        toast.info("相談履歴がありません。新規で開始します。");
        const initial = createInitialSessionForNewUser();
        setAllSessions([initial]);
        setActiveSessionId(initial.id);
      } else {
        const mapped = mapApiSessionsToSessionData(sessions);
        setAllSessions(mapped);
        setActiveSessionId(mapped[0]?.id ?? "new-session");
        setIsHistoryOpen(true);
      }
    } catch {
      toast.error("履歴の取得に失敗しました");
      setUserChoice(null);
    }
    setIsExistingLoading(false);
  };

  const handleSessionChange = (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);

    if (session && !session.isOpen) {
      setAllSessions(allSessions.map(s =>
        s.id === sessionId
          ? { ...s, isOpen: true, status: "active", lastUpdated: new Date() }
          : s
      ));
    }

    setActiveSessionId(sessionId);
    if (onInputValueChange) {
      onInputValueChange("");
    }
  };

  const handleSessionClose = (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);

    if (session && session.status === "paused") {
      setAllSessions(allSessions.map(s =>
        s.id === sessionId ? { ...s, isOpen: false } : s
      ));

      if (sessionId === activeSessionId) {
        const remaining = displaySessions.filter(s => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          handleNewSession();
        }
      }
      return;
    }

    if (openSessions.length === 1) {
      toast.error("タブを閉じられません", { description: "最後の1つは閉じられません。" });
      return;
    }

    const sessionIndex = openSessions.findIndex((s) => s.id === sessionId);

    setAllSessions(allSessions.map(s =>
      s.id === sessionId ? { ...s, isOpen: false } : s
    ));

    if (sessionId === activeSessionId) {
      const newActiveIndex = Math.max(0, sessionIndex - 1);
      const remainingOpen = openSessions.filter(s => s.id !== sessionId);
      setActiveSessionId(remainingOpen[newActiveIndex].id);
    }
  };

  const handleRenameSession = (sessionId: string, newName: string) => {
    setAllSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === sessionId
          ? { ...session, name: newName, lastUpdated: new Date() }
          : session
      )
    );
    toast.success("セッション名を変更しました");
  };

  const handleNewSession = () => {
    if (openSessions.length >= MAX_OPEN_TABS) {
      toast.error("タブ数の上限", { description: `タブは${MAX_OPEN_TABS}個までです。いずれかを閉じてから新規を開いてください。` });
      return;
    }

    const newSession = createInitialSessionForNewUser();
    const newSessionId = `session-${Date.now()}`;
    const updatedSession = { ...newSession, id: newSessionId };

    setAllSessions([...allSessions, updatedSession]);
    setActiveSessionId(newSessionId);
  };

  const handleOpenSession = (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) return;

    if (session.isOpen) {
      setActiveSessionId(sessionId);
      setIsHistoryOpen(false);
      return;
    }

    if (openSessions.length >= MAX_OPEN_TABS) {
      toast.error("タブ数の上限", { description: `タブは${MAX_OPEN_TABS}個までです。いずれかを閉じてから開いてください。` });
      return;
    }

    setAllSessions(allSessions.map(s =>
      s.id === sessionId ? { ...s, isOpen: true, lastUpdated: new Date() } : s
    ));
    setActiveSessionId(sessionId);
    setIsHistoryOpen(false);
  };

  const handleTogglePin = (sessionId: string) => {
    setAllSessions(allSessions.map(s =>
      s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
    ));
  };

  const handleDeleteSession = (sessionId: string) => {
    if (allSessions.length === 1) {
      toast.error("削除できません", { description: "最後の1件は削除できません。" });
      return;
    }

    setAllSessions(allSessions.filter(s => s.id !== sessionId));

    if (sessionId === activeSessionId) {
      const remaining = allSessions.filter(s => s.id !== sessionId && s.isOpen);
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
      } else {
        const allRemaining = allSessions.filter(s => s.id !== sessionId);
        if (allRemaining.length > 0) {
          setActiveSessionId(allRemaining[0].id);
          setAllSessions(allSessions.map(s =>
            s.id === allRemaining[0].id ? { ...s, isOpen: true } : s
          ).filter(s => s.id !== sessionId));
        }
      }
    }

    toast.success("セッションを削除しました");
  };

  const handleStepClick = (stepId: number) => {
    if (!currentSession) return;
    const step = currentSession?.steps?.find(s => s.id === stepId);
    if (!step) return;

    if (step.status === "completed") {
      setStepToNavigate(stepId);
    } else if (step.status === "active") {
      return;
    } else {
      toast.info("ステップ未完了", { description: "このステップはまだ完了していません。" });
    }
  };

  const confirmStepNavigation = () => {
    if (stepToNavigate === null) return;

    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? { ...s, currentStepId: stepToNavigate, lastUpdated: new Date() }
        : s
    ));

    toast.success(`STEP ${stepToNavigate} に戻りました`);
    setStepToNavigate(null);
  };

  const handleEndSession = () => {
    setIsEndingSession(true);
  };

  const confirmEndSession = async () => {
    const now = new Date();
    const sessionToEnd = allSessions.find(s => s.id === activeSessionId);
    if (!sessionToEnd) {
      setIsEndingSession(false);
      return;
    }

    const apiStatus = endSessionStatus === "completed" ? "completed" : "archived";

    try {
      if (sessionToEnd.id === "new-session") {
        const formData = new FormData();
        formData.set("title", sessionToEnd.name);
        formData.set("category", "general");
        const firstUserMsg = sessionToEnd.messages?.find(m => m.type === "user")?.content ?? "";
        formData.set("initial_message", firstUserMsg || "新規相談を開始");
        const res = await fetch("/api/consulting/sessions", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          const savedId = data.session?.id;
          if (savedId) {
            const patchRes = await fetch(`/api/consulting/sessions/${savedId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: apiStatus,
                ...(endSessionStatus === "completed" ? { completed_at: now.toISOString() } : {}),
              }),
            });
            if (!patchRes.ok) {
              toast.error("ステータスの更新に失敗しました");
            }
          }
        }
      } else {
        const patchRes = await fetch(`/api/consulting/sessions/${sessionToEnd.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: apiStatus,
            ...(endSessionStatus === "completed" ? { completed_at: now.toISOString() } : {}),
          }),
        });
        if (!patchRes.ok) {
          toast.error("ステータスの更新に失敗しました");
        }
      }
    } catch {
      toast.error("保存に失敗しました");
    }

    const updates: Partial<SessionData> = {
      isOpen: false,
      lastUpdated: now,
      status: endSessionStatus,
    };
    if (endSessionStatus === "completed") {
      updates.progress = 100;
      updates.completedAt = now;
    } else if (endSessionStatus === "cancelled") {
      updates.completedAt = now;
    }

    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId ? { ...s, ...updates } : s
    ));

    const remainingOpen = openSessions.filter(s => s.id !== activeSessionId);
    if (remainingOpen.length > 0) {
      setActiveSessionId(remainingOpen[0].id);
    } else {
      handleNewSession();
    }

    setIsEndingSession(false);
    toast.success("今日の会話はすべて記憶しました");
  };

  return {
    // 状態
    userChoice,
    setUserChoice,
    allSessions,
    setAllSessions,
    activeSessionId,
    setActiveSessionId,
    sessionsLoaded,
    currentSession,
    displaySessions,
    openSessions,
    isHistoryOpen,
    setIsHistoryOpen,
    isExistingLoading,
    stepToNavigate,
    setStepToNavigate,
    isEndingSession,
    setIsEndingSession,
    endSessionStatus,
    setEndSessionStatus,
    
    // ハンドラー
    handleChoiceNew,
    handleChoiceExisting,
    handleSessionChange,
    handleSessionClose,
    handleRenameSession,
    handleNewSession,
    handleOpenSession,
    handleTogglePin,
    handleDeleteSession,
    handleStepClick,
    confirmStepNavigation,
    handleEndSession,
    confirmEndSession,
  };
}
