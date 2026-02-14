/**
 * クライアントサイド Stripe.js
 *
 * Stripe Elements（決済フォーム）の描画に使用する。
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY（pk_test_ / pk_live_）が必要。
 *
 * シングルトンパターンで、loadStripe() の呼び出しは1回のみ。
 *
 * @see stripe-payment-spec-v2.2.md §8-2
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js"

let stripePromise: Promise<Stripe | null> | null = null

/**
 * クライアントサイドStripe.jsインスタンスを取得する
 *
 * @returns Stripe.js インスタンスのPromise
 *
 * @example
 * ```tsx
 * // Reactコンポーネント内で使用
 * import { Elements } from '@stripe/react-stripe-js'
 * import { getStripeClient } from '@/lib/stripe/client'
 *
 * export default function CheckoutPage() {
 *   return (
 *     <Elements stripe={getStripeClient()}>
 *       <CheckoutForm />
 *     </Elements>
 *   )
 * }
 * ```
 */
export function getStripeClient(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    if (!publishableKey) {
      console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY が設定されていません")
      return Promise.resolve(null)
    }

    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}
