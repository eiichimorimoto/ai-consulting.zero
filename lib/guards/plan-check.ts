/**
 * サーバーサイド プランチェックユーティリティ
 *
 * API Routeやサーバーコンポーネントでプラン制限とapp_statusを確認する。
 *
 * @see stripe-payment-spec-v2.2.md §8-2, §8-3
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanType } from '@/lib/plan-config'

export interface PlanCheckResult {
  allowed: boolean
  planType: PlanType
  appStatus: string
  reason?: 'insufficient_plan' | 'suspended' | 'no_subscription'
}

/**
 * ユーザーのプランとアクセス権を検証する
 *
 * @param supabase - Supabaseクライアント
 * @param userId - ユーザーID
 * @param requiredPlan - 必要なプランの最低レベル
 */
export async function checkPlanAccess(
  supabase: SupabaseClient,
  userId: string,
  requiredPlan: PlanType = 'free'
): Promise<PlanCheckResult> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_type, app_status, status')
    .eq('user_id', userId)
    .single()

  // サブスクリプションなし → Freeプラン
  if (!subscription) {
    if (requiredPlan === 'free') {
      return { allowed: true, planType: 'free', appStatus: 'active' }
    }
    return {
      allowed: false,
      planType: 'free',
      appStatus: 'active',
      reason: 'insufficient_plan',
    }
  }

  // サービス停止チェック（§8-2）
  if (subscription.app_status === 'suspended') {
    return {
      allowed: false,
      planType: subscription.plan_type as PlanType,
      appStatus: 'suspended',
      reason: 'suspended',
    }
  }

  // プランレベルチェック
  const planLevel: Record<string, number> = { free: 0, pro: 1, enterprise: 2 }
  const userLevel = planLevel[subscription.plan_type] ?? 0
  const requiredLevel = planLevel[requiredPlan] ?? 0

  if (userLevel < requiredLevel) {
    return {
      allowed: false,
      planType: subscription.plan_type as PlanType,
      appStatus: subscription.app_status || 'active',
      reason: 'insufficient_plan',
    }
  }

  return {
    allowed: true,
    planType: subscription.plan_type as PlanType,
    appStatus: subscription.app_status || 'active',
  }
}
