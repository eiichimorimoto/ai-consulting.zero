/**
 * コンサルティング機能の共通型定義
 *
 * Start画面およびコンサルティング関連コンポーネントで使用される型
 *
 * @module types/consulting
 */

import { ReactNode } from "react"

/**
 * コンサルティングステップ
 */
export type ConsultingStep = {
  id: number
  title: string
  icon: ReactNode
  /** completed=完了, active=進行中, paused=一時中止（戻ったことで離れたステップ）, pending=未着手 */
  status: "completed" | "active" | "pending" | "paused"
  summary?: string[]
}

/**
 * チャットメッセージ
 */
export type Message = {
  id: number
  type: "ai" | "user"
  content: string
  timestamp: Date
  interactive?: {
    type: "buttons" | "form" | "chart" | "category-buttons" | "subcategory-buttons" | "custom-input"
    data?: CategoryData[] | string[]
    selectedCategory?: string
  }
}

/**
 * カテゴリデータ
 */
export type CategoryData = {
  label: string
  icon: string
  color: string
  bgLight?: string // カード背景用の薄い色（ラベル色に合わせる）
}

/**
 * KPI指標
 */
export type KPI = {
  label: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
}

/**
 * セッションステータス
 */
export type SessionStatus = "active" | "paused" | "completed" | "cancelled"

/**
 * セッションデータ
 */
export type SessionData = {
  id: string
  name: string
  progress: number
  currentStepId: number
  messages: Message[]
  kpis: KPI[]
  steps: ConsultingStep[]
  lastUpdated: Date
  createdAt: Date
  isPinned: boolean
  isOpen: boolean
  status: SessionStatus
  completedAt?: Date
  conversationId?: string // Dify会話ID
}

/**
 * API相談セッション1件の型
 */
export type ApiSession = {
  id: string
  title: string
  status: string | null
  current_round: number | null
  max_rounds: number | null
  /** 一度でも進んだ最大 round（0始まり）。ステップ戻り時の「一時中止」表示に使用 */
  max_reached_round?: number | null
  created_at: string | null
  updated_at: string | null
  completed_at: string | null
  conversation_id: string | null // Dify会話ID
}
