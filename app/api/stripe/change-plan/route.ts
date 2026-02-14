/**
 * プラン変更API（Stripe連携）
 *
 * POST body: { new_plan: 'pro'|'enterprise', billing_interval: 'monthly'|'yearly' }
 *
 * 有料→有料: stripe.subscriptions.update() で即時変更（日割り調整あり）
 * Free→有料: create-checkout APIへのリダイレクト指示を返す
 *
 * @see stripe-payment-spec-v2.2.md §4-5
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

    // 2. レート制限: 3回/分（§4-1）
    const rateLimitError = applyRateLimit(request, "stripeChangePlan", user.id)
    if (rateLimitError) return rateLimitError

    // 3. リクエストボディの検証
    const body = await request.json().catch(() => ({}))
    const newPlan = body.new_plan as string
    const billingInterval = body.billing_interval as string

    if (!newPlan || !PAID_PLANS.includes(newPlan as PlanType)) {
      return NextResponse.json(
        { error: "無効なプランです。pro / enterprise のいずれかを指定してください。" },
        { status: 400 }
      )
    }

    if (!billingInterval || !VALID_INTERVALS.includes(billingInterval as BillingInterval)) {
      return NextResponse.json(
        { error: "無効な課金間隔です。monthly / yearly のいずれかを指定してください。" },
        { status: 400 }
      )
    }

    // 4. 現在のサブスクリプション情報を取得
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, plan_type, status")
      .eq("user_id", user.id)
      .single()

    // 5. Freeプランからの変更 → Checkout APIへリダイレクト指示
    if (
      !subscription?.stripe_subscription_id ||
      subscription.plan_type === "free" ||
      subscription.status === "canceled"
    ) {
      return NextResponse.json({
        action: "redirect_to_checkout",
        message: "新規契約が必要です。Checkoutページへ遷移してください。",
      })
    }

    // 6. 新しいPrice IDを取得
    const newPriceId = getPriceId(newPlan as PlanType, billingInterval as BillingInterval)

    // 7. Stripe Subscriptionの詳細を取得してsubscription_item.idを取得（§4-5 M6）
    const stripe = getStripe()
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    )
    const subscriptionItemId = stripeSubscription.items.data[0]?.id

    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: "サブスクリプションアイテムが見つかりません" },
        { status: 500 }
      )
    }

    // 8. Stripe Subscription更新（§4-5）
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [{ id: subscriptionItemId, price: newPriceId }],
        proration_behavior: "create_prorations",
      }
    )

    // 9. DBを更新
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        plan_type: newPlan,
        stripe_price_id: newPriceId,
        billing_interval: billingInterval,
        status: updatedSubscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (updateError) {
      console.error("[change-plan] DB update failed:", updateError)
      // Stripe側は変更済みなのでエラーにはするがロールバックはしない
      // （Webhookで同期される）
    }

    return NextResponse.json({
      success: true,
      plan_type: newPlan,
      billing_interval: billingInterval,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[change-plan] Error:", message)
    return NextResponse.json({ error: "プラン変更に失敗しました" }, { status: 500 })
  }
}
