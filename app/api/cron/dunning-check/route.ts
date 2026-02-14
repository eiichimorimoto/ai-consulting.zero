/**
 * 督促チェック Cron Job
 *
 * 毎日0:00 UTC実行。
 * - Day 3/7/14: 督促メール送信
 * - Day 17: app_status → suspended（サービス停止）+ 停止通知メール
 * - Day 30: Stripe解約 + plan_type → free
 *
 * CRON_SECRETヘッダーで認証する。
 *
 * @see stripe-payment-spec-v2.2.md §6-2, §6-4, §6-8
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe } from "@/lib/stripe/server"
import { sendEmail } from "@/lib/email/send"
import { dunningDay3Template } from "@/lib/email/templates/dunning-day3"
import { dunningDay7Template } from "@/lib/email/templates/dunning-day7"
import { dunningDay14Template } from "@/lib/email/templates/dunning-day14"
import { serviceSuspendedTemplate } from "@/lib/email/templates/service-suspended"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://solvewise.jp"

export async function GET(request: NextRequest) {
  // CRON_SECRET認証
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()
  const now = new Date()
  const results = { processed: 0, emails: 0, suspended: 0, canceled: 0, errors: 0 }

  try {
    // 未解決のpayment_failuresを取得
    const { data: failures, error } = await supabaseAdmin
      .from("payment_failures")
      .select(
        "*, subscriptions!inner(user_id, stripe_subscription_id, stripe_customer_id, app_status)"
      )
      .eq("dunning_status", "active")
      .is("resolved_at", null)

    if (error) {
      console.error("[dunning-check] Failed to fetch failures:", error)
      return NextResponse.json({ error: "DB error" }, { status: 500 })
    }

    if (!failures || failures.length === 0) {
      return NextResponse.json({ message: "No active dunning cases", ...results })
    }

    for (const failure of failures) {
      results.processed++
      const daysSinceFirstFailure = Math.floor(
        (now.getTime() - new Date(failure.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      // ユーザーメールアドレスを取得
      const userId = (failure as Record<string, unknown>).subscriptions
        ? (((failure as Record<string, unknown>).subscriptions as Record<string, unknown>)
            .user_id as string)
        : null

      if (!userId) continue

      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
      const userEmail = authData?.user?.email
      const userName = authData?.user?.user_metadata?.display_name || "お客様"
      const updatePaymentUrl = `${APP_URL}/account/billing/update-payment`

      if (!userEmail) continue

      try {
        // Day 30: 自動解約（§6-2）
        if (daysSinceFirstFailure >= 30) {
          const subData = (failure as Record<string, unknown>).subscriptions as Record<
            string,
            string
          >
          const stripe = getStripe()

          await stripe.subscriptions.cancel(subData.stripe_subscription_id)

          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "canceled",
              plan_type: "free",
              app_status: "active",
              canceled_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("user_id", userId)

          await supabaseAdmin
            .from("payment_failures")
            .update({ dunning_status: "canceled", resolved_at: now.toISOString() })
            .eq("id", failure.id)

          results.canceled++
          continue
        }

        // Day 17: サービス停止（§6-2, §6-4）
        if (daysSinceFirstFailure >= 17) {
          const subData = (failure as Record<string, unknown>).subscriptions as Record<
            string,
            string
          >
          if (subData.app_status !== "suspended") {
            await supabaseAdmin
              .from("subscriptions")
              .update({ app_status: "suspended", updated_at: now.toISOString() })
              .eq("user_id", userId)

            await supabaseAdmin
              .from("payment_failures")
              .update({
                dunning_status: "suspended",
                service_suspended_at: now.toISOString(),
              })
              .eq("id", failure.id)

            // 停止通知メール
            const template = serviceSuspendedTemplate({ userName, updatePaymentUrl })
            await sendEmail({ to: userEmail, ...template })
            results.suspended++
            results.emails++
          }
          continue
        }

        // Day 14: 最終警告メール
        if (daysSinceFirstFailure >= 14 && daysSinceFirstFailure < 17) {
          const template = dunningDay14Template({ userName, updatePaymentUrl })
          await sendEmail({ to: userEmail, ...template })
          results.emails++
          continue
        }

        // Day 7: 警告メール
        if (daysSinceFirstFailure >= 7 && daysSinceFirstFailure < 14) {
          const template = dunningDay7Template({ userName, updatePaymentUrl })
          await sendEmail({ to: userEmail, ...template })
          results.emails++
          continue
        }

        // Day 3: お知らせメール
        if (daysSinceFirstFailure >= 3 && daysSinceFirstFailure < 7) {
          const template = dunningDay3Template({ userName, updatePaymentUrl })
          await sendEmail({ to: userEmail, ...template })
          results.emails++
        }
      } catch (err) {
        console.error(`[dunning-check] Error processing failure ${failure.id}:`, err)
        results.errors++
      }
    }

    console.log("[dunning-check] Results:", results)
    return NextResponse.json(results)
  } catch (err) {
    console.error("[dunning-check] Fatal error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
