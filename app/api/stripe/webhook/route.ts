/**
 * Stripe Webhook エンドポイント
 *
 * Stripeからのイベント通知を受信し、署名検証・冪等性チェック後に
 * 各ハンドラーへ振り分ける。
 *
 * - 署名検証: request.text() + constructEvent()（§7-4）
 * - 冪等性: stripe_webhook_events INSERT ON CONFLICT（§4-4）
 * - レート制限: 不要（Stripe署名検証で保護）
 *
 * @see stripe-payment-spec-v2.2.md §4-2, §4-4, §7-4
 */

import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleInvoiceFinalized,
  handleTrialWillEnd,
} from "@/lib/stripe/webhook-handlers"
import type Stripe from "stripe"

/**
 * Webhookイベントの冪等性を保証する
 *
 * stripe_webhook_events テーブルに INSERT を試み、
 * UNIQUE制約違反（23505）なら既に処理済みと判断する。
 *
 * @returns true = 新規イベント（処理続行）、false = 重複（スキップ）
 * @throws DBエラー（UNIQUE制約違反以外）
 */
async function checkIdempotency(
  event: Stripe.Event,
  supabaseAdmin: ReturnType<typeof createAdminClient>
): Promise<{ isNew: boolean; error?: string }> {
  const { error: insertError } = await supabaseAdmin.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processed_at: new Date().toISOString(),
  })

  // UNIQUE制約違反 = 既に処理済み
  if (insertError?.code === "23505") {
    return { isNew: false }
  }

  // その他のDBエラー
  if (insertError) {
    console.error("[Webhook] Failed to record event:", insertError)
    return { isNew: false, error: insertError.message }
  }

  return { isNew: true }
}

/**
 * イベントタイプに応じたハンドラーを呼び出す
 */
async function routeEvent(
  event: Stripe.Event,
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof createAdminClient>
): Promise<void> {
  switch (event.type) {
    // --- サブスクリプション系（§4-2 🔴 必須） ---
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event, stripe, supabaseAdmin)
      break

    case "customer.subscription.created":
      await handleSubscriptionCreated(event, stripe, supabaseAdmin)
      break

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event, stripe, supabaseAdmin)
      break

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event, stripe, supabaseAdmin)
      break

    // --- 請求書系（§4-2 🔴 必須） ---
    case "invoice.paid":
      await handleInvoicePaid(event, stripe, supabaseAdmin)
      break

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event, stripe, supabaseAdmin)
      break

    // --- 推奨イベント（§4-2 🟡） ---
    case "invoice.finalized":
      await handleInvoiceFinalized(event, stripe, supabaseAdmin)
      break

    case "customer.subscription.trial_will_end":
      await handleTrialWillEnd(event, stripe, supabaseAdmin)
      break

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`)
  }
}

/**
 * POST /api/stripe/webhook
 *
 * Stripeからのイベントを受信・処理する。
 * レート制限なし（Stripe署名検証で保護 — §4-1注記）
 */
export async function POST(request: Request) {
  // 1. Raw bodyを取得（§7-4: request.json()は署名検証が失敗する）
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    console.warn("[Webhook] Missing stripe-signature header")
    return new Response("Missing stripe-signature header", { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET is not configured")
    return new Response("Webhook secret not configured", { status: 500 })
  }

  // 2. 署名検証（§7-4）
  let event: Stripe.Event
  const stripe = getStripe()

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Webhook] Signature verification failed:", message)
    return new Response("Webhook signature verification failed", { status: 400 })
  }

  // 3. 冪等性チェック（§4-4 — INSERT ON CONFLICTパターン）
  const supabaseAdmin = createAdminClient()
  const { isNew, error: idempotencyError } = await checkIdempotency(event, supabaseAdmin)

  if (idempotencyError) {
    // DBエラー時は500を返してStripeにリトライさせる（§4-4）
    return new Response("Internal error", { status: 500 })
  }

  if (!isNew) {
    // 重複イベント: 200を返してStripeの再送を停止（§4-4）
    console.log(`[Webhook] Duplicate event skipped: ${event.id} (${event.type})`)
    return NextResponse.json({ received: true, duplicate: true })
  }

  // 4. イベントルーティング
  try {
    console.log(`[Webhook] Processing: ${event.type} (${event.id})`)
    await routeEvent(event, stripe, supabaseAdmin)
    console.log(`[Webhook] Completed: ${event.type} (${event.id})`)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[Webhook] Handler error for ${event.type}:`, message)
    // 処理エラー時は500を返してStripeにリトライさせる（§4-4）
    return new Response("Webhook handler error", { status: 500 })
  }

  return NextResponse.json({ received: true })
}
