/**
 * 開発環境用のサンプルセッションデータ
 *
 * 本番環境ではAPIから取得するため、このデータは使用されない
 * 使用箇所: 開発中のUIプレビュー、Storybook、テスト環境など
 *
 * @module lib/consulting/sample-data
 */

import { SessionData } from "@/types/consulting"
import { MessageSquare, BarChart3, Lightbulb, Target, FileText } from "lucide-react"

/**
 * 開発環境用のサンプルセッションデータを生成
 *
 * 4つのセッションを含む:
 * - session-1: 売上の伸び悩み（進捗40%、active）
 * - session-2: コスト削減（進捗80%、active）
 * - session-3: 新規事業立ち上げ（進捗60%、paused）
 * - session-4: 組織改革（進捗30%、paused）
 *
 * @returns サンプルセッションデータの配列
 */
export const createInitialSessions = (): SessionData[] => [
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
        content:
          "こんにちは！AIコンサルティングアシスタントです。まず、貴社の現状についてお聞かせください。現在直面している主な課題は何ですか？",
        timestamp: new Date(Date.now() - 120000),
        interactive: {
          type: "category-buttons",
          data: [
            {
              label: "売上の伸び悩み",
              icon: "TrendingDown",
              color: "bg-red-500",
              bgLight: "bg-red-50 border-red-200",
            },
            {
              label: "コスト削減",
              icon: "DollarSign",
              color: "bg-green-500",
              bgLight: "bg-green-50 border-green-200",
            },
            {
              label: "新規事業立ち上げ",
              icon: "Rocket",
              color: "bg-blue-500",
              bgLight: "bg-blue-50 border-blue-200",
            },
            {
              label: "組織改革",
              icon: "Users",
              color: "bg-purple-500",
              bgLight: "bg-purple-50 border-purple-200",
            },
            {
              label: "その他",
              icon: "Edit3",
              color: "bg-gray-500",
              bgLight: "bg-gray-50 border-gray-200",
            },
          ],
        },
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
        content:
          "承知しました。売上の伸び悩みについて詳しく分析していきましょう。現在の月間売上はどのくらいですか？また、目標とする売上はいくらでしょうか？",
        timestamp: new Date(Date.now() - 60000),
        interactive: {
          type: "form",
        },
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
        icon: <MessageSquare className="h-5 w-5" />,
        status: "completed",
        summary: ["売上の伸び悩み", "新規顧客獲得が低調", "単価の低下"],
      },
      {
        id: 2,
        title: "現状分析",
        icon: <BarChart3 className="h-5 w-5" />,
        status: "active",
        summary: ["月間売上: ¥12.5M", "平均単価: ¥10,125", "リピート率: 42%"],
      },
      {
        id: 3,
        title: "解決策の提案",
        icon: <Lightbulb className="h-5 w-5" />,
        status: "pending",
      },
      {
        id: 4,
        title: "実行計画の策定",
        icon: <Target className="h-5 w-5" />,
        status: "pending",
      },
      {
        id: 5,
        title: "レポート作成",
        icon: <FileText className="h-5 w-5" />,
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
        content:
          "コスト削減についてのご相談ですね。まず、現在の主要なコスト項目を教えていただけますか？",
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
        content:
          "承知しました。人件費と設備維持費について詳しく分析していきましょう。現在の削減目標はどのくらいですか？",
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
        icon: <MessageSquare className="h-5 w-5" />,
        status: "completed",
        summary: ["コスト削減", "人件費の最適化", "設備維持費の削減"],
      },
      {
        id: 2,
        title: "現状分析",
        icon: <BarChart3 className="h-5 w-5" />,
        status: "completed",
        summary: ["月間コスト: ¥8.2M", "人件費率: 45%", "設備費率: 28%"],
      },
      {
        id: 3,
        title: "解決策の提案",
        icon: <Lightbulb className="h-5 w-5" />,
        status: "completed",
        summary: ["業務自動化", "シフト最適化", "設備統合"],
      },
      {
        id: 4,
        title: "実行計画の策定",
        icon: <Target className="h-5 w-5" />,
        status: "active",
      },
      {
        id: 5,
        title: "レポート作成",
        icon: <FileText className="h-5 w-5" />,
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
        icon: <MessageSquare className="h-5 w-5" />,
        status: "completed",
      },
      {
        id: 2,
        title: "現状分析",
        icon: <BarChart3 className="h-5 w-5" />,
        status: "completed",
      },
      {
        id: 3,
        title: "解決策の提案",
        icon: <Lightbulb className="h-5 w-5" />,
        status: "active",
      },
      {
        id: 4,
        title: "実行計画の策定",
        icon: <Target className="h-5 w-5" />,
        status: "pending",
      },
      {
        id: 5,
        title: "レポート作成",
        icon: <FileText className="h-5 w-5" />,
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
        icon: <MessageSquare className="h-5 w-5" />,
        status: "completed",
      },
      {
        id: 2,
        title: "現状分析",
        icon: <BarChart3 className="h-5 w-5" />,
        status: "active",
      },
      {
        id: 3,
        title: "解決策の提案",
        icon: <Lightbulb className="h-5 w-5" />,
        status: "pending",
      },
      {
        id: 4,
        title: "実行計画の策定",
        icon: <Target className="h-5 w-5" />,
        status: "pending",
      },
      {
        id: 5,
        title: "レポート作成",
        icon: <FileText className="h-5 w-5" />,
        status: "pending",
      },
    ],
  },
]
