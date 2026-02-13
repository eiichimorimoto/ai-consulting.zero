/**
 * Stripe Price ID 一元管理
 *
 * 環境変数からPrice IDを取得するヘルパー。
 * テスト環境と本番環境で異なるIDとなるため、環境変数による切替が必須。
 *
 * 環境変数名（v2.2仕様書 §1-2）:
 *   STRIPE_PRICE_PRO_MONTHLY
 *   STRIPE_PRICE_PRO_YEARLY
 *   STRIPE_PRICE_ENTERPRISE_MONTHLY
 *   STRIPE_PRICE_ENTERPRISE_YEARLY
 *
 * @see stripe-payment-spec-v2.2.md §1-2, §4-5
 */
import type { PlanType } from '@/lib/plan-config'

export type BillingInterval = 'monthly' | 'yearly'

/**
 * Price ID マッピング
 * サーバーサイドでのみ使用（環境変数はNEXT_PUBLIC_ではないため）
 */
const PRICE_IDS: Record<string, string | undefined> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
}

/**
 * プランと課金間隔からStripe Price IDを取得する
 *
 * @param plan - プランタイプ（'pro' | 'enterprise'）
 * @param interval - 課金間隔（'monthly' | 'yearly'）
 * @returns Stripe Price ID（price_xxx）
 * @throws Freeプランを指定した場合、またはPrice IDが未設定の場合
 *
 * @example
 * ```ts
 * const priceId = getPriceId('pro', 'monthly')
 * // => 'price_1Szcmy1SgA5HQnSLpHaz24jG'
 * ```
 */
export function getPriceId(plan: PlanType, interval: BillingInterval): string {
  if (plan === 'free') {
    throw new Error('Freeプランには Price ID は存在しません')
  }

  const key = `${plan}_${interval}`
  const priceId = PRICE_IDS[key]

  if (!priceId) {
    throw new Error(
      `Price ID 未設定: STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()} を .env.local に設定してください`
    )
  }

  return priceId
}

/**
 * 全Price IDの設定状態を検証する（起動時チェック用）
 *
 * @returns 未設定のPrice ID名の配列（空配列なら全て設定済み）
 */
export function validatePriceIds(): string[] {
  const required = [
    'STRIPE_PRICE_PRO_MONTHLY',
    'STRIPE_PRICE_PRO_YEARLY',
    'STRIPE_PRICE_ENTERPRISE_MONTHLY',
  ]

  const optional = ['STRIPE_PRICE_ENTERPRISE_YEARLY']

  const missing = required.filter((key) => !process.env[key])

  // Enterprise年額は未提供の場合もあるため警告のみ
  const optionalMissing = optional.filter((key) => !process.env[key])
  if (optionalMissing.length > 0) {
    console.warn(`[Stripe Config] 任意のPrice ID未設定: ${optionalMissing.join(', ')}`)
  }

  return missing
}
