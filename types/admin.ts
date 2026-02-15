/**
 * 管理ダッシュボード用 型定義
 */

// ─── Slack通知 ───

export type SlackSeverity = "info" | "warning" | "error"

export interface SlackBlock {
  type: "section" | "divider" | "header" | "context"
  text?: { type: "mrkdwn" | "plain_text"; text: string }
  fields?: Array<{ type: "mrkdwn" | "plain_text"; text: string }>
  elements?: Array<{ type: "mrkdwn" | "plain_text"; text: string }>
}

export interface SendSlackParams {
  text: string
  blocks?: SlackBlock[]
  severity?: SlackSeverity
  /** テスト用: 送信をスキップする */
  dryRun?: boolean
}

export interface SendSlackResult {
  success: boolean
  error?: string
}

// ─── Slack通知イベント ───

export type SlackEventType =
  | "user_signup"
  | "plan_change"
  | "subscription_canceled"
  | "payment_failure"
  | "payment_failure_critical"
  | "service_suspended"
  | "service_restored"
  | "system_health_warning"
  | "api_error_spike"
  | "admin_action"
  | "daily_digest"

// ─── 管理操作ログ ───

export interface AdminActionLog {
  userId: string
  actionType: string
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
}

// ─── 招待コード ───

export interface AdminInvitation {
  id: string
  code: string
  createdBy: string
  createdByName?: string
  usedBy: string | null
  usedByName?: string | null
  expiresAt: string
  usedAt: string | null
  createdAt: string
  status: "active" | "used" | "expired" | "cancelled"
}

// ─── 管理者ユーザー（設定画面用） ───

export interface AdminMember {
  userId: string
  name: string
  email: string
  createdAt: string
  isSelf: boolean
}

// ─── 管理API レスポンス ───

export interface AdminUser {
  id: string
  userId: string
  name: string
  email: string
  companyName?: string
  planType: string
  appStatus?: string
  subscriptionStatus?: string
  monthlyChatCount: number
  monthlyOcrCount: number
  createdAt: string
}

export interface PaymentFailureItem {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  stripeInvoiceId: string
  stripeSubscriptionId: string
  attemptCount: number
  lastAttemptAt: string
  dunningStatus: string
  failureReason?: string
  createdAt: string
}

export interface SystemHealthItem {
  service: string
  status: "healthy" | "warning" | "error"
  responseTimeMs?: number
  message: string
  lastChecked: string
}

export interface KpiOverview {
  dau: number
  mau: number
  mrr: number
  arr: number
  totalUsers: number
  activeSubscriptions: number
  churnRate: number
  newUsersToday: number
  sessionsToday: number
}

// ─── 管理ナビゲーション ───

export interface AdminNavItem {
  label: string
  href: string
  icon: string
  badge?: number
}
