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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, BarChart3, CheckCircle2, FileText, Lightbulb, MessageSquare, Send, Target, TrendingDown, DollarSign, Rocket, Users, Edit3, Cpu, Shield, Cloud, Zap, X, Paperclip, Mic, MicOff } from "lucide-react";
import { useState, useMemo, useRef, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { celebrateStepCompletion } from "@/lib/utils/confetti";

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
            { label: "売上の伸び悩み", icon: "TrendingDown", color: "bg-red-500" },
            { label: "コスト削減", icon: "DollarSign", color: "bg-green-500" },
            { label: "新規事業立ち上げ", icon: "Rocket", color: "bg-blue-500" },
            { label: "組織改革", icon: "Users", color: "bg-purple-500" },
            { label: "その他", icon: "Edit3", color: "bg-gray-500" }
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

export default function ConsultingStartPage() {
  const [allSessions, setAllSessions] = useState<SessionData[]>(() => createInitialSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>("session-1");
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
      toast.error(voiceError);
    }
  }, [voiceError]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [stepToNavigate, setStepToNavigate] = useState<number | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endSessionStatus, setEndSessionStatus] = useState<SessionStatus>("paused");

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

  const currentSession = useMemo(
    () => allSessions.find((s) => s.id === activeSessionId) || allSessions[0],
    [allSessions, activeSessionId]
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
      toast.error("最後のタブは閉じられません");
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
      toast.error(`タブは最大${MAX_OPEN_TABS}個までです。既存のタブを閉じてください。`);
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
              { label: "売上の伸び悩み", icon: "TrendingDown", color: "bg-red-500" },
              { label: "コスト削減", icon: "DollarSign", color: "bg-green-500" },
              { label: "新規事業立ち上げ", icon: "Rocket", color: "bg-blue-500" },
              { label: "組織改革", icon: "Users", color: "bg-purple-500" },
              { label: "DX推進", icon: "Cpu", color: "bg-indigo-500" },
              { label: "セキュリティ強化", icon: "Shield", color: "bg-amber-500" },
              { label: "クラウド移行", icon: "Cloud", color: "bg-cyan-500" },
              { label: "業務自動化", icon: "Zap", color: "bg-yellow-500" },
              { label: "その他", icon: "Edit3", color: "bg-gray-500" }
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
      toast.error(`タブは最大${MAX_OPEN_TABS}個までです。既存のタブを閉じてください。`);
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
      toast.error("最後のセッションは削除できません");
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
      toast.info("このステップはまだ完了していません");
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

  const confirmEndSession = () => {
    const now = new Date();
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
      s.id === activeSessionId
        ? { ...s, ...updates }
        : s
    ));

    const remainingOpen = openSessions.filter(s => s.id !== activeSessionId);
    if (remainingOpen.length > 0) {
      setActiveSessionId(remainingOpen[0].id);
    } else {
      handleNewSession();
    }

    setIsEndingSession(false);

    const statusMessages = {
      paused: "会話を一時中断しました",
      completed: "会話を完了しました",
      cancelled: "会話を中止しました",
      active: ""
    };
    toast.success(statusMessages[endSessionStatus]);
  };

  const tabSessions: Session[] = displaySessions.map(s => ({
    id: s.id,
    name: s.name,
    progress: s.progress,
    lastUpdated: s.lastUpdated,
    isActive: s.id === activeSessionId,
    status: s.status,
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
    <div className="flex flex-col h-screen bg-background">
      {/* Session Tabs */}
      <div className="flex-shrink-0">
        <SessionTabs
          sessions={tabSessions}
          activeSessionId={activeSessionId}
          onSessionChange={handleSessionChange}
          onSessionClose={handleSessionClose}
          onNewSession={handleNewSession}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onRenameSession={handleRenameSession}
        />
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

      {/* Step Navigation Confirmation Dialog */}
      <AlertDialog open={stepToNavigate !== null} onOpenChange={() => setStepToNavigate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ステップに戻りますか？</AlertDialogTitle>
            <AlertDialogDescription>
              STEP {stepToNavigate} に戻ると、現在の進捗が変更されます。よろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStepNavigation}>戻る</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Session Confirmation Dialog */}
      <AlertDialog open={isEndingSession} onOpenChange={setIsEndingSession}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>会話を終了しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この会話をどのように終了しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-accent" htmlFor="status-paused">
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
                <div className="font-semibold text-sm">一時中断</div>
                <div className="text-xs text-muted-foreground mt-1">後で続きをやる予定です</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-accent" htmlFor="status-completed">
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
                <div className="font-semibold text-sm">完了</div>
                <div className="text-xs text-muted-foreground mt-1">課題が解決しました</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-accent" htmlFor="status-cancelled">
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
                <div className="font-semibold text-sm">中止</div>
                <div className="text-xs text-muted-foreground mt-1">この課題は不要になりました</div>
              </div>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndSession}>
              終了する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Steps Navigation */}
        <aside className="w-80 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-xl font-bold text-sidebar-foreground">{currentSession.name}</h1>
            <p className="text-sm text-sidebar-foreground/70 mt-1">構造化された対話体験</p>
          </div>

          <div className="p-6 space-y-4">
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
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : step.status === "completed"
                              ? "bg-sidebar-accent/50 text-sidebar-foreground/80 hover:bg-sidebar-accent/70 cursor-pointer"
                              : "text-sidebar-foreground/50 cursor-not-allowed"
                          }`}
                      >
                        <div className={`mt-0.5 ${step.status === "completed" ? "text-primary" : ""}`}>
                          {step.status === "completed" ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-sidebar-foreground/50">STEP {index + 1}</span>
                            {step.status === "active" && (
                              <Badge variant="default" className="text-xs px-2 py-0">進行中</Badge>
                            )}
                            {step.status === "completed" && (
                              <Badge variant="secondary" className="text-xs px-2 py-0">完了</Badge>
                            )}
                          </div>
                          <p className="font-semibold text-sm mt-1">{step.title}</p>

                          {step.summary && step.summary.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {step.summary.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <div className="w-1 h-1 rounded-full bg-sidebar-foreground/40 mt-1.5 flex-shrink-0" />
                                  <p className="text-xs text-sidebar-foreground/60 leading-relaxed">{item}</p>
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

          <div className="p-4 border-t border-sidebar-border space-y-2 flex-shrink-0">
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={() => toast.info("レポートエクスポート機能は準備中です")}
            >
              <FileText className="w-4 h-4 mr-2" />
              レポートをエクスポート
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              size="sm"
              onClick={handleEndSession}
            >
              <X className="w-4 h-4 mr-2" />
              会話を終了
            </Button>
          </div>
        </aside>

        {/* Center - Chat Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <header className="border-b border-border bg-card px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {currentSession.steps.find(s => s.status === "active")?.title || "課題のヒアリング"}
                </h2>
                <p className="text-sm text-muted-foreground">貴社の現状を詳しく分析しています</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
                AI応答中
              </Badge>
            </div>
          </header>

          <ScrollArea className="flex-1 h-0 max-h-full p-6">
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
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-card-foreground border border-border shadow-sm"
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
                                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary bg-card hover:bg-accent transition-all group"
                              >
                                <div className={`${category.color} text-white p-2 rounded-full group-hover:scale-110 transition-transform`}>
                                  {IconComponent && <IconComponent className="w-4 h-4" />}
                                </div>
                                <span className="text-xs font-medium text-center leading-tight">{category.label}</span>
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
                            <Button size="sm" className="w-full mt-2">
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
          </ScrollArea>

          <footer className="flex-shrink-0 border-t border-border bg-card p-4">
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
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder={isListening ? "音声入力中..." : "メッセージを入力..."}
                  className="flex-1"
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
                          toast.info('音声入力を開始しました');
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
                <Button onClick={handleSendMessage} size="icon" disabled={isListening}>
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
        />
      </div>
    </div>
  );
}
