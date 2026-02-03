'use client';

/* Structured Dialogue Design with Session Management
 * 3-column layout: Steps (left) | Chat (center) | Context (right)
 * Tab-based session management (max 5 tabs) with history panel
 * Interactive step navigation with summary display
 * Colors: Navy sidebar, Teal accents, Warm gray background
 * Typography: IBM Plex Sans (headings), Inter (body)
 */

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

type ConsultingStep = {
  id: number;
  title: string;
  icon: ReactNode;
  status: "completed" | "active" | "pending";
  summary?: string[];
};

type Message = {
  id: number;
  type: "ai" | "user";
  content: string;
  timestamp: Date;
  interactive?: {
    type: "buttons" | "form" | "chart" | "category-buttons" | "subcategory-buttons" | "custom-input";
    data?: CategoryData[] | string[];
    selectedCategory?: string;
  };
};

type CategoryData = {
  label: string;
  icon: string;
  color: string;
  bgLight?: string; // カード背景用の薄い色（ラベル色に合わせる）
};

type KPI = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
};

type SessionStatus = "active" | "paused" | "completed" | "cancelled";

type SessionData = {
  id: string;
  name: string;
  progress: number;
  currentStepId: number;
  messages: Message[];
  kpis: KPI[];
  steps: ConsultingStep[];
  lastUpdated: Date;
  createdAt: Date;
  isPinned: boolean;
  isOpen: boolean;
  status: SessionStatus;
  completedAt?: Date;
};

const MAX_OPEN_TABS = 5;

/** セッション名（ラベル）→ タブ左端のカテゴリー色（bg-* クラス） */
const CATEGORY_ACCENT_MAP: Record<string, string> = {
  "売上の伸び悩み": "bg-red-500",
  "コスト削減": "bg-green-500",
  "新規事業立ち上げ": "bg-blue-500",
  "組織改革": "bg-purple-500",
  "その他": "bg-gray-500",
  "DX推進": "bg-indigo-500",
  "セキュリティ強化": "bg-amber-500",
  "クラウド移行": "bg-cyan-500",
  "業務自動化": "bg-yellow-500",
};

// Sample session data - includes both open and closed sessions
const createInitialSessions = (): SessionData[] => [
  {
    id: "session-1",
    name: "売上の伸び悩み",
    progress: 40,
    currentStepId: 2,
    lastUpdated: new Date(Date.now() - 7200000),
    createdAt: new Date(Date.now() - 86400000 * 3),
    isPinned: true,
    isOpen: true,
    status: "active",
    messages: [
      {
        id: 1,
        type: "ai",
        content: "こんにちは！AIコンサルティングアシスタントです。まず、貴社の現状についてお聞かせください。現在直面している主な課題は何ですか？",
        timestamp: new Date(Date.now() - 120000),
        interactive: {
          type: "category-buttons",
          data: [
            { label: "売上の伸び悩み", icon: "TrendingDown", color: "bg-red-500", bgLight: "bg-red-50 border-red-200" },
            { label: "コスト削減", icon: "DollarSign", color: "bg-green-500", bgLight: "bg-green-50 border-green-200" },
            { label: "新規事業立ち上げ", icon: "Rocket", color: "bg-blue-500", bgLight: "bg-blue-50 border-blue-200" },
            { label: "組織改革", icon: "Users", color: "bg-purple-500", bgLight: "bg-purple-50 border-purple-200" },
            { label: "その他", icon: "Edit3", color: "bg-gray-500", bgLight: "bg-gray-50 border-gray-200" }
          ]
        }
      },
      {
        id: 2,
        type: "user",
        content: "売上の伸び悩み",
        timestamp: new Date(Date.now() - 90000),
      },
      {
        id: 3,
        type: "ai",
        content: "承知しました。売上の伸び悩みについて詳しく分析していきましょう。現在の月間売上はどのくらいですか？また、目標とする売上はいくらでしょうか？",
        timestamp: new Date(Date.now() - 60000),
        interactive: {
          type: "form",
        }
      },
    ],
    kpis: [
      { label: "月間売上", value: "¥12.5M", change: "-8%", trend: "down" },
      { label: "顧客数", value: "1,234", change: "+3%", trend: "up" },
      { label: "平均単価", value: "¥10,125", change: "-11%", trend: "down" },
      { label: "リピート率", value: "42%", change: "+5%", trend: "up" },
    ],
    steps: [
      {
        id: 1,
        title: "課題のヒアリング",
        icon: <MessageSquare className="w-5 h-5" />,
        status: "completed",
        summary: ["売上の伸び悩み", "新規顧客獲得が低調", "単価の低下"]
      },
      {
        id: 2,
        title: "現状分析",
        icon: <BarChart3 className="w-5 h-5" />,
        status: "active",
        summary: ["月間売上: ¥12.5M", "平均単価: ¥10,125", "リピート率: 42%"]
      },
      {
        id: 3,
        title: "解決策の提案",
        icon: <Lightbulb className="w-5 h-5" />,
        status: "pending",
      },
      {
        id: 4,
        title: "実行計画の策定",
        icon: <Target className="w-5 h-5" />,
        status: "pending",
      },
      {
        id: 5,
        title: "レポート作成",
        icon: <FileText className="w-5 h-5" />,
        status: "pending",
      },
    ],
  },
  {
    id: "session-2",
    name: "コスト削減",
    progress: 80,
    currentStepId: 4,
    lastUpdated: new Date(Date.now() - 86400000),
    createdAt: new Date(Date.now() - 86400000 * 7),
    isPinned: false,
    isOpen: true,
    status: "active",
    messages: [
      {
        id: 1,
        type: "ai",
        content: "コスト削減についてのご相談ですね。まず、現在の主要なコスト項目を教えていただけますか？",
        timestamp: new Date(Date.now() - 86400000),
      },
      {
        id: 2,
        type: "user",
        content: "人件費と設備維持費が大きいです",
        timestamp: new Date(Date.now() - 86300000),
      },
      {
        id: 3,
        type: "ai",
        content: "承知しました。人件費と設備維持費について詳しく分析していきましょう。現在の削減目標はどのくらいですか？",
        timestamp: new Date(Date.now() - 86200000),
      },
    ],
    kpis: [
      { label: "月間コスト", value: "¥8.2M", change: "-12%", trend: "down" },
      { label: "人件費率", value: "45%", change: "-5%", trend: "down" },
      { label: "設備費率", value: "28%", change: "-3%", trend: "down" },
      { label: "削減目標達成率", value: "78%", change: "+15%", trend: "up" },
    ],
    steps: [
      {
        id: 1,
        title: "課題のヒアリング",
        icon: <MessageSquare className="w-5 h-5" />,
        status: "completed",
        summary: ["コスト削減", "人件費の最適化", "設備維持費の削減"]
      },
      {
        id: 2,
        title: "現状分析",
        icon: <BarChart3 className="w-5 h-5" />,
        status: "completed",
        summary: ["月間コスト: ¥8.2M", "人件費率: 45%", "設備費率: 28%"]
      },
      {
        id: 3,
        title: "解決策の提案",
        icon: <Lightbulb className="w-5 h-5" />,
        status: "completed",
        summary: ["業務自動化", "シフト最適化", "設備統合"]
      },
      {
        id: 4,
        title: "実行計画の策定",
        icon: <Target className="w-5 h-5" />,
        status: "active",
      },
      {
        id: 5,
        title: "レポート作成",
        icon: <FileText className="w-5 h-5" />,
        status: "pending",
      },
    ],
  },
  {
    id: "session-3",
    name: "新規事業立ち上げ",
    progress: 60,
    currentStepId: 3,
    lastUpdated: new Date(Date.now() - 86400000 * 5),
    createdAt: new Date(Date.now() - 86400000 * 14),
    isPinned: false,
    isOpen: false,
    status: "paused",
    messages: [
      {
        id: 1,
        type: "ai",
        content: "新規事業立ち上げについてのご相談ですね。どのような事業を考えていますか？",
        timestamp: new Date(Date.now() - 86400000 * 5),
      },
    ],
    kpis: [
      { label: "初期投資額", value: "¥50M", change: "---", trend: "neutral" },
      { label: "予想ROI", value: "15%", change: "---", trend: "neutral" },
      { label: "市場規模", value: "¥500M", change: "---", trend: "neutral" },
      { label: "競合数", value: "8社", change: "---", trend: "neutral" },
    ],
    steps: [
      {
        id: 1,
        title: "課題のヒアリング",
        icon: <MessageSquare className="w-5 h-5" />,
        status: "completed",
      },
      {
        id: 2,
        title: "現状分析",
        icon: <BarChart3 className="w-5 h-5" />,
        status: "completed",
      },
      {
        id: 3,
        title: "解決策の提案",
        icon: <Lightbulb className="w-5 h-5" />,
        status: "active",
      },
      {
        id: 4,
        title: "実行計画の策定",
        icon: <Target className="w-5 h-5" />,
        status: "pending",
      },
      {
        id: 5,
        title: "レポート作成",
        icon: <FileText className="w-5 h-5" />,
        status: "pending",
      },
    ],
  },
  {
    id: "session-4",
    name: "組織改革",
    progress: 30,
    currentStepId: 2,
    lastUpdated: new Date(Date.now() - 86400000 * 10),
    createdAt: new Date(Date.now() - 86400000 * 20),
    isPinned: false,
    isOpen: false,
    status: "paused",
    messages: [
      {
        id: 1,
        type: "ai",
        content: "組織改革についてのご相談ですね。現在の組織の課題は何ですか？",
        timestamp: new Date(Date.now() - 86400000 * 10),
      },
    ],
    kpis: [
      { label: "従業員満足度", value: "65%", change: "-5%", trend: "down" },
      { label: "離職率", value: "12%", change: "+3%", trend: "down" },
      { label: "生産性指数", value: "78", change: "-2%", trend: "down" },
      { label: "部門間連携", value: "60%", change: "+0%", trend: "neutral" },
    ],
    steps: [
      {
        id: 1,
        title: "課題のヒアリング",
        icon: <MessageSquare className="w-5 h-5" />,
        status: "completed",
      },
      {
        id: 2,
        title: "現状分析",
        icon: <BarChart3 className="w-5 h-5" />,
        status: "active",
      },
      {
        id: 3,
        title: "解決策の提案",
        icon: <Lightbulb className="w-5 h-5" />,
        status: "pending",
      },
      {
        id: 4,
        title: "実行計画の策定",
        icon: <Target className="w-5 h-5" />,
        status: "pending",
      },
      {
        id: 5,
        title: "レポート作成",
        icon: <FileText className="w-5 h-5" />,
        status: "pending",
      },
    ],
  },
];

/** API相談セッション1件の型 */
type ApiSession = {
  id: string;
  title: string;
  status: string | null;
  current_round: number | null;
  max_rounds: number | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};

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
          data: [
            { label: "売上の伸び悩み", icon: "TrendingDown", color: "bg-red-500", bgLight: "bg-red-50 border-red-200" },
            { label: "コスト削減", icon: "DollarSign", color: "bg-green-500", bgLight: "bg-green-50 border-green-200" },
            { label: "新規事業立ち上げ", icon: "Rocket", color: "bg-blue-500", bgLight: "bg-blue-50 border-blue-200" },
            { label: "組織改革", icon: "Users", color: "bg-purple-500", bgLight: "bg-purple-50 border-purple-200" },
            { label: "DX推進", icon: "Cpu", color: "bg-indigo-500", bgLight: "bg-indigo-50 border-indigo-200" },
            { label: "セキュリティ強化", icon: "Shield", color: "bg-amber-500", bgLight: "bg-amber-50 border-amber-200" },
            { label: "クラウド移行", icon: "Cloud", color: "bg-cyan-500", bgLight: "bg-cyan-50 border-cyan-200" },
            { label: "業務自動化", icon: "Zap", color: "bg-yellow-500", bgLight: "bg-yellow-50 border-yellow-200" },
            { label: "その他", icon: "Edit3", color: "bg-gray-500", bgLight: "bg-gray-50 border-gray-200" }
          ]
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
  const [userChoice, setUserChoice] = useState<UserChoice>(null);
  const [allSessions, setAllSessions] = useState<SessionData[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice input
  const { isListening, transcript, startListening, stopListening, resetTranscript, error: voiceError, enableAICorrection, setEnableAICorrection } = useVoiceInput();

  // Update input value when transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  // Show voice error as toast
  useEffect(() => {
    if (voiceError) {
      toast.error("音声エラー", { description: voiceError });
    }
  }, [voiceError]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExistingLoading, setIsExistingLoading] = useState(false);
  const [stepToNavigate, setStepToNavigate] = useState<number | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endSessionStatus, setEndSessionStatus] = useState<SessionStatus>("paused");

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

  // 初回: ラベルは出さない。sessionsLoaded のみ立てて選択UIを表示（APIは既存選択時に取得）
  useEffect(() => {
    setSessionsLoaded(true);
  }, []);

  // 既存セッション（API由来）を選択したときにメッセージを取得
  const currentSession = useMemo(
    () => allSessions.find((s) => s.id === activeSessionId) || allSessions[0],
    [allSessions, activeSessionId]
  );
  useEffect(() => {
    if (!currentSession || currentSession.id === "new-session" || currentSession.messages.length > 0) return;
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

  // Get sessions to display in tabs (open + recent paused sessions, max 5)
  const displaySessions = useMemo(() => {
    const open = allSessions.filter((s) => s.isOpen);

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
    setInputValue("");
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

    const newSessionId = `session-${Date.now()}`;
    const now = new Date();
    const newSession: SessionData = {
      id: newSessionId,
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
            data: [
              { label: "売上の伸び悩み", icon: "TrendingDown", color: "bg-red-500", bgLight: "bg-red-50 border-red-200" },
              { label: "コスト削減", icon: "DollarSign", color: "bg-green-500", bgLight: "bg-green-50 border-green-200" },
              { label: "新規事業立ち上げ", icon: "Rocket", color: "bg-blue-500", bgLight: "bg-blue-50 border-blue-200" },
              { label: "組織改革", icon: "Users", color: "bg-purple-500", bgLight: "bg-purple-50 border-purple-200" },
              { label: "DX推進", icon: "Cpu", color: "bg-indigo-500", bgLight: "bg-indigo-50 border-indigo-200" },
              { label: "セキュリティ強化", icon: "Shield", color: "bg-amber-500", bgLight: "bg-amber-50 border-amber-200" },
              { label: "クラウド移行", icon: "Cloud", color: "bg-cyan-500", bgLight: "bg-cyan-50 border-cyan-200" },
              { label: "業務自動化", icon: "Zap", color: "bg-yellow-500", bgLight: "bg-yellow-50 border-yellow-200" },
              { label: "その他", icon: "Edit3", color: "bg-gray-500", bgLight: "bg-gray-50 border-gray-200" }
            ]
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
        {
          id: 1,
          title: "課題のヒアリング",
          icon: <MessageSquare className="w-5 h-5" />,
          status: "active",
        },
        {
          id: 2,
          title: "現状分析",
          icon: <BarChart3 className="w-5 h-5" />,
          status: "pending",
        },
        {
          id: 3,
          title: "解決策の提案",
          icon: <Lightbulb className="w-5 h-5" />,
          status: "pending",
        },
        {
          id: 4,
          title: "実行計画の策定",
          icon: <Target className="w-5 h-5" />,
          status: "pending",
        },
        {
          id: 5,
          title: "レポート作成",
          icon: <FileText className="w-5 h-5" />,
          status: "pending",
        },
      ],
    };

    setAllSessions([...allSessions, newSession]);
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    let messageContent = inputValue;

    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(f => f.name).join(", ");
      messageContent += attachedFiles.length > 0 ? `\n\n添付ファイル: ${fileNames}` : "";
    }

    const newMessage: Message = {
      id: currentSession.messages.length + 1,
      type: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: [...s.messages, newMessage], lastUpdated: new Date() }
        : s
    ));
    setInputValue("");
    setAttachedFiles([]);
    resetTranscript();

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: currentSession.messages.length + 2,
        type: "ai",
        content: "ご入力ありがとうございます。内容を分析しています。詳しい情報があれば、より具体的な提案が可能です。",
        timestamp: new Date(),
      };

      setAllSessions(prevSessions => prevSessions.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, aiResponse], lastUpdated: new Date() }
          : s
      ));
    }, 1000);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length}個のファイルを添付しました`);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [currentSession.messages]);

  const handleQuickReply = (reply: string, isCategory: boolean = false) => {
    const newMessage: Message = {
      id: currentSession.messages.length + 1,
      type: "user",
      content: reply,
      timestamp: new Date(),
    };

    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? {
          ...s,
          name: s.name === "新規相談" ? reply : s.name,
          messages: [...s.messages, newMessage],
          lastUpdated: new Date()
        }
        : s
    ));

    if (isCategory && reply !== "その他") {
      setTimeout(() => {
        const subcategoryMap: Record<string, string[]> = {
          "売上の伸び悩み": ["新規顧客獲得が低調", "既存顧客の離脱", "単価の低下", "市場シェアの減少"],
          "コスト削減": ["人件費の最適化", "設備維持費の削減", "在庫管理の改善", "業務効率化"],
          "新規事業立ち上げ": ["市場調査・分析", "事業計画の策定", "資金調達", "チーム編成"],
          "組織改革": ["組織構造の見直し", "人事評価制度の改善", "コミュニケーション活性化", "企業文化の変革"],
          "DX推進": ["デジタル戦略の策定", "レガシーシステムの刷新", "データ活用基盤の構築", "AI/MLの導入"],
          "セキュリティ強化": ["サイバー攻撃対策", "情報漏洩防止", "コンプライアンス対応", "ゼロトラスト導入"],
          "クラウド移行": ["クラウド戦略の立案", "オンプレからの移行", "コスト最適化", "マルチクラウド対応"],
          "業務自動化": ["RPA導入", "ワークフロー最適化", "API連携基盤", "ノーコードツール活用"]
        };

        const subcategories = subcategoryMap[reply] || [];
        const aiResponse: Message = {
          id: currentSession.messages.length + 2,
          type: "ai",
          content: `「${reply}」についてですね。さらに詳しくお聞かせください。具体的にはどのような課題でしょうか？`,
          timestamp: new Date(),
          interactive: {
            type: "subcategory-buttons",
            data: subcategories,
            selectedCategory: reply
          }
        };

        setAllSessions(prevSessions => prevSessions.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, aiResponse], lastUpdated: new Date() }
            : s
        ));
      }, 800);
    } else if (reply === "その他") {
      setTimeout(() => {
        const aiResponse: Message = {
          id: currentSession.messages.length + 2,
          type: "ai",
          content: "承知しました。どのような課題でしょうか？自由に入力してください。",
          timestamp: new Date(),
          interactive: {
            type: "custom-input"
          }
        };

        setAllSessions(prevSessions => prevSessions.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, aiResponse], lastUpdated: new Date() }
            : s
        ));
      }, 800);
    }
  };

  const handleStepClick = (stepId: number) => {
    const step = currentSession.steps.find(s => s.id === stepId);
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

  const previousCompletedStepsRef = useRef(0);

  useEffect(() => {
    const completedSteps = currentSession.steps.filter(s => s.status === 'completed').length;

    if (completedSteps > previousCompletedStepsRef.current && previousCompletedStepsRef.current > 0) {
      celebrateStepCompletion();
      toast.success('ステップ完了！おめでとうございます！');
    }

    previousCompletedStepsRef.current = completedSteps;
  }, [currentSession.steps]);

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
        const firstUserMsg = sessionToEnd.messages.find(m => m.type === "user")?.content ?? "";
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

  const tabSessions: Session[] = displaySessions.map(s => ({
    id: s.id,
    name: s.name,
    progress: s.progress,
    lastUpdated: s.lastUpdated,
    isActive: s.id === activeSessionId,
    status: s.status,
    categoryAccent: CATEGORY_ACCENT_MAP[s.name],
  }));

  const historyItems: SessionHistoryItem[] = allSessions.map(s => ({
    id: s.id,
    name: s.name,
    progress: s.progress,
    lastUpdated: s.lastUpdated,
    createdAt: s.createdAt,
    isPinned: s.isPinned,
    status: s.status,
    completedAt: s.completedAt,
  }));

  if (!sessionsLoaded) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  // 初回: ラベルは出さず、新規/既存ボタンのみ（左blockの上・幅w-80内・背景付き・やや大きく）
  if (userChoice === null) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F9FA]">
        <div className="flex flex-shrink-0 w-full" style={{ maxWidth: "20rem" }}>
          <div className="flex gap-3 p-4 w-full">
            <button
              type="button"
              onClick={handleChoiceNew}
              disabled={isExistingLoading}
              className="flex-1 flex items-center justify-center gap-2 py-4 px-5 rounded-lg font-semibold text-white bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all text-base min-h-[52px]"
            >
              <span>新規</span>
            </button>
            <button
              type="button"
              onClick={handleChoiceExisting}
              disabled={isExistingLoading}
              className="flex-1 flex items-center justify-center gap-2 py-4 px-5 rounded-lg font-semibold text-white bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md hover:shadow-lg transition-all text-base min-h-[52px] disabled:opacity-50"
            >
              {isExistingLoading ? (
                <span className="text-sm">読込中...</span>
              ) : (
                <span>既存</span>
              )}
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          新規か既存を選んでください
        </div>
      </div>
    );
  }

  if (userChoice === "existing" && isExistingLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-gray-500">相談履歴を読み込み中...</p>
      </div>
    );
  }

  if (allSessions.length === 0) {
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
      {/* ラベル行: 左block幅内に新規/既存を先頭、その右にタブ＋履歴 */}
      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white items-stretch">
        <div className="w-80 flex-shrink-0 flex gap-2 p-2 items-center">
          <button
            type="button"
            onClick={handleNewSession}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-md font-semibold text-white bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm text-sm min-h-[44px]"
          >
            <span>新規</span>
          </button>
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-md font-semibold text-white bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm text-sm min-h-[44px]"
          >
            <span>既存</span>
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <SessionTabs
            sessions={tabSessions}
            activeSessionId={activeSessionId}
            onSessionChange={handleSessionChange}
            onSessionClose={handleSessionClose}
            onNewSession={handleNewSession}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onRenameSession={handleRenameSession}
            noBorder
          />
        </div>
      </div>

      {/* Session History Panel */}
      <SessionHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={historyItems}
        openSessionIds={openSessions.map(s => s.id)}
        onOpenSession={handleOpenSession}
        onTogglePin={handleTogglePin}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
      />

      {/* Step Navigation Confirmation Dialog（背景・文字・ボタンを明示して見やすく） */}
      <AlertDialog open={stepToNavigate !== null} onOpenChange={() => setStepToNavigate(null)}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-slate-100 text-lg font-semibold">
              ステップに戻りますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
              STEP {stepToNavigate} に戻ると、現在の進捗が変更されます。よろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStepNavigation}
              className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
            >
              戻る
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Session Confirmation Dialog（背景・文字を明示して透明化を防止） */}
      <AlertDialog open={isEndingSession} onOpenChange={setIsEndingSession}>
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
                checked={endSessionStatus === "paused"}
                onChange={(e) => setEndSessionStatus(e.target.value as SessionStatus)}
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
                checked={endSessionStatus === "completed"}
                onChange={(e) => setEndSessionStatus(e.target.value as SessionStatus)}
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
                checked={endSessionStatus === "cancelled"}
                onChange={(e) => setEndSessionStatus(e.target.value as SessionStatus)}
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
            <AlertDialogAction onClick={confirmEndSession} className="bg-red-600 hover:bg-red-700 text-white">
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
            <h1 className="text-xl font-bold text-slate-100">{currentSession.name}</h1>
            <p className="text-sm text-slate-400 mt-1">構造化された対話体験</p>
          </div>

          <div className="p-6 space-y-4 flex-shrink-0">
            <ConsultingProgressBar
              currentStep={currentSession.currentStepId}
              totalSteps={currentSession.steps.length}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            <nav className="space-y-2 pb-6">
              {currentSession.steps.map((step, index) => {
                const isClickable = step.status === "completed";

                return (
                  <Tooltip key={step.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleStepClick(step.id)}
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
              onClick={handleEndSession}
            >
              <X className="w-4 h-4 mr-2" />
              会話を終了
            </Button>
          </div>
        </aside>

        {/* Center - Chat Area（Local/ダッシュボードと同じ背景: グラデーション + ドット + グロー） */}
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
          <header className="relative z-10 border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {currentSession.steps.find(s => s.status === "active")?.title || "課題のヒアリング"}
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
              {currentSession.messages.map((message) => (
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
                                onClick={() => handleQuickReply(category.label, true)}
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
                              onClick={() => handleQuickReply(subcategory)}
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
                              onClick={() => handleQuickReply(option)}
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
              {attachedFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-accent text-accent-foreground px-3 py-1.5 rounded-md text-sm"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="text-xs truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(index)}
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
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileAttach}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="icon"
                  variant="outline"
                  type="button"
                  disabled={isListening}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
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
                <Button onClick={handleSendMessage} size="icon" disabled={isListening} className={BUTTON.primary}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </footer>
        </main>

        {/* Right Sidebar - Dynamic Context Panel */}
        <TabbedContextPanel
          currentStep={currentSession.currentStepId}
          sessionName={currentSession.name}
          kpis={currentSession.kpis}
          onInsertToChat={(text) => setInputValue(prev => prev ? `${prev}\n\n${text}` : text)}
          showDashboardPrompt={currentSession.name === "新規相談" && currentSession.progress === 0}
        />
      </div>
    </div>
  );
}
