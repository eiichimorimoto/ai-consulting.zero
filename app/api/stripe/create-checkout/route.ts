/**
 * Checkout Session 作成API
 *
 * POST body: {
 *   planType: 'pro'|'enterprise',
 *   interval: 'monthly'|'yearly',
 *   returnUrl?: string  // 支払い完了後の戻り先（省略時: /dashboard/settings?tab=plan）
 * }
 *
 * Stripe Checkout Sessionを作成し、URLを返す。
 * ユーザーはこのURLへリダイレクトされ、Stripe Checkoutページで決済を行う。
 *
 * @see stripe-payment-spec-v2.2.md §4-3
 */

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { getPriceId, type BillingInterval } from "@/lib/stripe/config"
import { applyRateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"
import type { PlanType } from "@/lib/plan-config"

const PAID_PLANS: PlanType[] = ["pro", "enterprise"]
const VALID_INTERVALS: BillingInterval[] = ["monthly", "yearly"]

export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 })
    }

    // 2. レート制限: 5回/分（§4-1）
    const rateLimitError = applyRateLimit(request, "stripeCheckout", user.id)
    if (rateLimitError) return rateLimitError

    // 3. リクエストボディの検証
    const body = await request.json().catch(() => ({}))
    const planType = body.planType as string
    const interval = body.interval as string
    const returnUrl = body.returnUrl as string | undefined

    if (!planType || !PAID_PLANS.includes(planType as PlanType)) {
      return NextResponse.json(
        { error: "無効なプランです。pro / enterprise のいずれかを指定してください。" },
        { status: 400 }
      )
    }

    if (!interval || !VALID_INTERVALS.includes(interval as BillingInterval)) {
      return NextResponse.json(
        { error: "無効な課金間隔です。monthly / yearly のいずれかを指定してください。" },
        { status: 400 }
      )
    }

    // 4. Price IDを取得
    const priceId = getPriceId(planType as PlanType, interval as BillingInterval)

    // 5. 既存のStripe Customer IDを検索（§4-3）
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single()

    // 6. Checkout Session パラメータ構築
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || ""

    // 戻り先URL（デフォルト: /dashboard/settings?tab=plan）
    const defaultReturnUrl = "/dashboard/settings?tab=plan"
    const successUrl = returnUrl || defaultReturnUrl
    const cancelUrl = returnUrl || defaultReturnUrl

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionParams: Record<string, any> = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelUrl}`,
      metadata: {
        user_id: user.id,
      },
      // 日本語ロケール
      locale: "ja",
      // 自動税計算（将来対応用）
      // automatic_tax: { enabled: true },
    }

    // 既存Customer → customerパラメータ / 新規 → customer_emailパラメータ（§4-3）
    if (subscription?.stripe_customer_id) {
      sessionParams.customer = subscription.stripe_customer_id
    } else {
      sessionParams.customer_email = user.email
    }

    // 7. Stripe Checkout Session作成
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[create-checkout] Error:", message)
    return NextResponse.json({ error: "Checkout Sessionの作成に失敗しました" }, { status: 500 })
  }
}
