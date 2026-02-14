/**
 * リテンションクーポン適用API
 *
 * POST body: { discountPercent: 20 | 30 }
 *
 * 解約防止のために割引クーポンをサブスクリプションに適用する。
 * 次回請求のみに適用される1回限りのクーポンを作成。
 *
 * @see stripe-payment-spec-v2.2.md §5-1
 */

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { applyRateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

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

    // 2. レート制限: 3回/分
    const rateLimitError = applyRateLimit(request, "stripeChangePlan", user.id)
    if (rateLimitError) return rateLimitError

    // 3. リクエストボディの検証
    const body = await request.json().catch(() => ({}))
    const discountPercent = body.discountPercent as number

    if (!discountPercent || (discountPercent !== 20 && discountPercent !== 30)) {
      return NextResponse.json(
        { error: "無効な割引率です。20または30を指定してください。" },
        { status: 400 }
      )
    }

    // 4. サブスクリプション情報を取得
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user.id)
      .single()

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "アクティブなサブスクリプションが見つかりません" },
        { status: 404 }
      )
    }

    const stripe = getStripe()

    // 5. 1回限りの割引クーポンを作成
    const coupon = await stripe.coupons.create({
      percent_off: discountPercent,
      duration: "once", // 次回請求のみ
      name: `Retention Offer ${discountPercent}% Off`,
      metadata: {
        user_id: user.id,
        type: "retention",
      },
    })

    // 6. サブスクリプションにクーポンを適用
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        discounts: [{ coupon: coupon.id }],
        metadata: {
          retention_applied: "true",
          retention_date: new Date().toISOString(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: `${discountPercent}%の割引が適用されました`,
      subscription: {
        id: updatedSubscription.id,
        discounts: updatedSubscription.discounts,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[apply-retention-coupon] Error:", message)
    return NextResponse.json({ error: "クーポンの適用に失敗しました" }, { status: 500 })
  }
}
