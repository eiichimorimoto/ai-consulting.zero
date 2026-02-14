/**
 * サブスクリプション解約API
 *
 * POST body: {
 *   reason_category: string,
 *   reason_detail?: string,
 *   cancel_type: 'end_of_period' | 'immediate',
 *   retention_accepted?: boolean
 * }
 *
 * 解約理由をcancellation_reasonsテーブルに保存し、
 * Stripe APIでサブスクリプションを停止する。
 *
 * @see stripe-payment-spec-v2.2.md §5-1, §5-2
 */

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { applyRateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

const VALID_REASONS = [
  "too_expensive",
  "unused",
  "customer_service",
  "low_quality",
  "switched_service",
  "missing_features",
  "too_complex",
  "other",
] as const

const VALID_CANCEL_TYPES = ["end_of_period", "immediate"] as const

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
    const rateLimitError = applyRateLimit(request, "stripeCancel", user.id)
    if (rateLimitError) return rateLimitError

    // 3. リクエストボディの検証
    const body = await request.json().catch(() => ({}))
    const reasonCategory = body.reason_category as string
    const reasonDetail = (body.reason_detail as string) || ""
    const cancelType = body.cancel_type as string

    if (
      !reasonCategory ||
      !VALID_REASONS.includes(reasonCategory as (typeof VALID_REASONS)[number])
    ) {
      return NextResponse.json({ error: "解約理由を選択してください。" }, { status: 400 })
    }

    if (
      !cancelType ||
      !VALID_CANCEL_TYPES.includes(cancelType as (typeof VALID_CANCEL_TYPES)[number])
    ) {
      return NextResponse.json(
        { error: "解約タイプを指定してください（end_of_period / immediate）。" },
        { status: 400 }
      )
    }

    // 4. サブスクリプション情報を取得
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, plan_type")
      .eq("user_id", user.id)
      .single()

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "アクティブなサブスクリプションが見つかりません。" },
        { status: 400 }
      )
    }

    // 5. cancellation_reasonsテーブルに理由を保存（§5-2 ステップ3）
    const { error: reasonError } = await supabase.from("cancellation_reasons").insert({
      user_id: user.id,
      subscription_id: subscription.stripe_subscription_id,
      reason_category: reasonCategory,
      reason_detail: reasonDetail.slice(0, 1000), // 最大1000文字
      plan_at_cancellation: subscription.plan_type,
    })

    if (reasonError) {
      console.error("[cancel] Failed to save cancellation reason:", reasonError)
      // 解約理由の保存失敗は解約処理自体をブロックしない
    }

    // 6. Stripe APIでサブスクリプション停止（§5-2 ステップ4-5）
    const stripe = getStripe()
    const cancellationDetails = {
      comment: reasonDetail.slice(0, 1000),
      feedback: reasonCategory as Stripe.SubscriptionCancelParams.CancellationDetails.Feedback,
    }

    if (cancelType === "end_of_period") {
      // 期間終了時解約（§5-2）
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at: "MAX_PERIOD_END" as unknown as number,
        cancellation_details: cancellationDetails,
      })
    } else {
      // 即時解約（§5-2）
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id, {
        cancellation_details: cancellationDetails,
      })
    }

    // 7. DBの cancel_at / canceled_at を更新（Webhookでも同期されるがUXのため即時反映）
    if (cancelType === "immediate") {
      await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          plan_type: "free",
          canceled_at: new Date().toISOString(),
          app_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
    }
    // end_of_periodの場合はWebhookの subscription.updated で cancel_at が設定される

    return NextResponse.json({
      success: true,
      cancel_type: cancelType,
      message:
        cancelType === "end_of_period"
          ? "現在の請求期間終了時にサブスクリプションが解約されます。"
          : "サブスクリプションが即時解約されました。",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[cancel] Error:", message)
    return NextResponse.json({ error: "解約処理に失敗しました" }, { status: 500 })
  }
}

// Stripe型のインポート（cancel API内でのみ使用）
import type Stripe from "stripe"
