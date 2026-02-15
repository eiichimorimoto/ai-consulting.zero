/**
 * Slack通知テンプレート（日本語）
 *
 * 各運用イベントに対応するメッセージを生成する。
 * lib/email/templates/ と同じ設計パターン。
 */

import { notifySlack, buildSlackBlocks } from "./notify"
import type { SlackSeverity } from "@/types/admin"

// ─── ユーザーイベント ───

export async function notifyUserSignup(params: {
  userName: string
  email: string
  companyName?: string
}) {
  return notifySlack({
    text: `新規登録: ${params.userName} (${params.email})`,
    blocks: buildSlackBlocks({
      title: "新規ユーザー登録",
      severity: "info",
      fields: [
        { label: "ユーザー名", value: params.userName },
        { label: "メール", value: params.email },
        ...(params.companyName ? [{ label: "会社名", value: params.companyName }] : []),
        { label: "プラン", value: "Free" },
      ],
    }),
    severity: "info",
  })
}

export async function notifyPlanChange(params: {
  userName: string
  email: string
  oldPlan: string
  newPlan: string
  amount?: string
}) {
  const isUpgrade = getPlanLevel(params.newPlan) > getPlanLevel(params.oldPlan)
  return notifySlack({
    text: `プラン${isUpgrade ? "アップグレード" : "変更"}: ${params.userName} (${params.oldPlan} → ${params.newPlan})`,
    blocks: buildSlackBlocks({
      title: isUpgrade ? "プランアップグレード" : "プラン変更",
      severity: "info",
      fields: [
        { label: "ユーザー", value: `${params.userName}\n${params.email}` },
        { label: "変更内容", value: `${params.oldPlan} → ${params.newPlan}` },
        ...(params.amount ? [{ label: "金額", value: params.amount }] : []),
      ],
    }),
    severity: "info",
  })
}

export async function notifySubscriptionCanceled(params: {
  userName: string
  email: string
  plan: string
  reason?: string
}) {
  return notifySlack({
    text: `解約申請: ${params.userName} (${params.plan})`,
    blocks: buildSlackBlocks({
      title: "サブスクリプション解約",
      severity: "warning",
      fields: [
        { label: "ユーザー", value: `${params.userName}\n${params.email}` },
        { label: "プラン", value: params.plan },
        ...(params.reason ? [{ label: "解約理由", value: params.reason }] : []),
      ],
    }),
    severity: "warning",
  })
}

// ─── 課金イベント ───

export async function notifyPaymentFailure(params: {
  userName: string
  email: string
  plan: string
  amount: string
  attemptCount: number
  failureReason?: string
  nextRetry?: string
}) {
  const isCritical = params.attemptCount >= 3
  const severity: SlackSeverity = isCritical ? "error" : "warning"

  return notifySlack({
    text: `決済失敗${isCritical ? "（要対応）" : ""}: ${params.userName} (${params.attemptCount}回目)`,
    blocks: buildSlackBlocks({
      title: isCritical ? "決済失敗 - 要対応" : "決済失敗",
      severity,
      fields: [
        { label: "ユーザー", value: `${params.userName}\n${params.email}` },
        { label: "金額", value: params.amount },
        { label: "試行回数", value: `${params.attemptCount}回` },
        ...(params.failureReason ? [{ label: "エラー", value: params.failureReason }] : []),
        ...(params.nextRetry ? [{ label: "次回再試行", value: params.nextRetry }] : []),
      ],
      ...(isCritical ? { text: "⚡ 3回以上の決済失敗です。手動対応を検討してください。" } : {}),
    }),
    severity,
  })
}

export async function notifyServiceSuspended(params: {
  userName: string
  email: string
  plan: string
  reason: string
}) {
  return notifySlack({
    text: `サービス停止: ${params.userName} - ${params.reason}`,
    blocks: buildSlackBlocks({
      title: "サブスクリプション停止",
      severity: "error",
      fields: [
        { label: "ユーザー", value: `${params.userName}\n${params.email}` },
        { label: "プラン", value: params.plan },
        { label: "理由", value: params.reason },
      ],
    }),
    severity: "error",
  })
}

export async function notifyServiceRestored(params: {
  userName: string
  email: string
  plan: string
}) {
  return notifySlack({
    text: `サービス復旧: ${params.userName} (${params.plan})`,
    blocks: buildSlackBlocks({
      title: "サービス復旧",
      severity: "info",
      fields: [
        { label: "ユーザー", value: `${params.userName}\n${params.email}` },
        { label: "プラン", value: params.plan },
      ],
    }),
    severity: "info",
  })
}

// ─── システムイベント ───

export async function notifySystemHealthWarning(params: {
  service: string
  status: string
  message: string
  responseTimeMs?: number
}) {
  return notifySlack({
    text: `システムヘルス警告: ${params.service} - ${params.status}`,
    blocks: buildSlackBlocks({
      title: "システムヘルス警告",
      severity: "warning",
      fields: [
        { label: "サービス", value: params.service },
        { label: "ステータス", value: params.status },
        { label: "詳細", value: params.message },
        ...(params.responseTimeMs
          ? [{ label: "応答時間", value: `${params.responseTimeMs}ms` }]
          : []),
      ],
    }),
    severity: "warning",
  })
}

// ─── 管理者操作 ───

export async function notifyAdminAction(params: {
  adminEmail: string
  action: string
  targetUser?: string
  details?: string
}) {
  return notifySlack({
    text: `管理者操作: ${params.action}${params.targetUser ? ` → ${params.targetUser}` : ""}`,
    blocks: buildSlackBlocks({
      title: "管理者操作",
      severity: "info",
      fields: [
        { label: "管理者", value: params.adminEmail },
        { label: "操作", value: params.action },
        ...(params.targetUser ? [{ label: "対象ユーザー", value: params.targetUser }] : []),
        ...(params.details ? [{ label: "詳細", value: params.details }] : []),
      ],
    }),
    severity: "info",
  })
}

// ─── 日次ダイジェスト ───

export async function notifyDailyDigest(params: {
  date: string
  dau: number
  newUsers: number
  canceledUsers: number
  sessions: number
  revenue: string
  paymentFailures: number
}) {
  return notifySlack({
    text: `日次ダイジェスト (${params.date})`,
    blocks: buildSlackBlocks({
      title: `日次ダイジェスト (${params.date})`,
      severity: "info",
      fields: [
        { label: "アクティブユーザー", value: `${params.dau}名` },
        { label: "新規登録", value: `${params.newUsers}名` },
        { label: "解約", value: `${params.canceledUsers}名` },
        { label: "セッション数", value: `${params.sessions}件` },
        { label: "売上", value: params.revenue },
        { label: "決済失敗", value: `${params.paymentFailures}件` },
      ],
    }),
    severity: "info",
  })
}

// ─── ヘルパー ───

function getPlanLevel(plan: string): number {
  const levels: Record<string, number> = { free: 0, pro: 1, enterprise: 2 }
  return levels[plan.toLowerCase()] ?? 0
}
