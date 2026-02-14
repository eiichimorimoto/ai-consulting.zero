/**
 * サーバーサイド Stripe インスタンス
 *
 * API Routes / Server Actions からStripe APIを呼び出す際に使用する。
 * STRIPE_SECRET_KEY（sk_test_ / sk_live_）が必要。
 *
 * ⚠️ クライアントサイドでは使用不可（シークレットキーの露出を防止）
 *
 * @see stripe-payment-spec-v2.2.md §1-1
 */
import Stripe from "stripe"

let stripeInstance: Stripe | null = null

/**
 * サーバーサイドStripeインスタンスを取得する
 *
 * @returns Stripe インスタンス
 * @throws STRIPE_SECRET_KEY が未設定の場合
 *
 * @example
 * ```ts
 * // API Route内で使用
 * import { getStripe } from '@/lib/stripe/server'
 *
 * export async function POST(request: Request) {
 *   const stripe = getStripe()
 *   const session = await stripe.checkout.sessions.create({ ... })
 * }
 * ```
 */
export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance

  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY が設定されていません")
  }

  stripeInstance = new Stripe(secretKey)

  return stripeInstance
}
