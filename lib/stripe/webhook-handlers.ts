/**
 * Stripe Webhook ハンドラー集約ファイル
 *
 * 全Webhookイベントのハンドラーを1ファイルにまとめ、
 * app/api/stripe/webhook/route.ts から呼び出す。
 *
 * @see stripe-payment-spec-v2.2.md §4-2, §4-3, §4-4, §5-2, §6-3, §6-4
 */

import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PlanType } from "@/lib/plan-config"
import {
  notifyPlanChange,
  notifySubscriptionCanceled,
  notifyPaymentFailure,
} from "@/lib/slack/templates"

// ============================================================
// 型定義
// ============================================================

type AdminClient = SupabaseClient

/**
 * Stripe Subscription status → DB plan_type のマッピング用ヘルパー
 * Stripe Price ID から plan_type を逆引きする
 */
function planTypeFromPriceId(priceId: string): PlanType {
  const priceMap: Record<string, PlanType> = {}

  // 環境変数からマッピングを構築
  if (process.env.STRIPE_PRICE_PRO_MONTHLY) {
    priceMap[process.env.STRIPE_PRICE_PRO_MONTHLY] = "pro"
  }
  if (process.env.STRIPE_PRICE_PRO_YEARLY) {
    priceMap[process.env.STRIPE_PRICE_PRO_YEARLY] = "pro"
  }
  if (process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY) {
    priceMap[process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY] = "enterprise"
  }
  if (process.env.STRIPE_PRICE_ENTERPRISE_YEARLY) {
    priceMap[process.env.STRIPE_PRICE_ENTERPRISE_YEARLY] = "enterprise"
  }

  return priceMap[priceId] ?? "free"
}

/**
 * Stripe Price ID → billing_interval を逆引きする
 */
function intervalFromPriceId(priceId: string): "monthly" | "yearly" | null {
  if (
    priceId === process.env.STRIPE_PRICE_PRO_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY
  ) {
    return "monthly"
  }
  if (
    priceId === process.env.STRIPE_PRICE_PRO_YEARLY ||
    priceId === process.env.STRIPE_PRICE_ENTERPRISE_YEARLY
  ) {
    return "yearly"
  }
  return null
}

/**
 * Stripe v20+: current_period_start/end は SubscriptionItem に移動。
 * items.data[0] から取得するヘルパー。
 */
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items?.data?.[0]
  return {
    currentPeriodStart: item?.current_period_start ?? null,
    currentPeriodEnd: item?.current_period_end ?? null,
  }
}

// ============================================================
// Step 2: サブスクリプション系ハンドラー（§4-2 🔴 必須）
// ============================================================

/**
 * checkout.session.completed ハンドラー
 *
 * Checkout完了時にCustomer ID・Subscription IDを保存し、
 * subscriptionsテーブルをUPSERTする（§4-3）。
 *
 * 順序不整合対応: customer.subscription.created が先に到着する場合がある。
 * UPSERTパターンで安全に処理（§4-4）。
 */
export async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  stripe: Stripe,
  supabaseAdmin: AdminClient
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session

  // mode=subscription のみ処理
  if (session.mode !== "subscription") {
    console.log("[Webhook] checkout.session.completed: non-subscription mode, skipping")
    return
  }

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const customerEmail = session.customer_email || session.customer_details?.email

  if (!customerId || !subscriptionId) {
    console.error("[Webhook] checkout.session.completed: missing customer or subscription ID")
    return
  }

  // Stripe Subscriptionの詳細を取得
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price?.id
  const planType = priceId ? planTypeFromPriceId(priceId) : "pro"
  const billingInterval = priceId ? intervalFromPriceId(priceId) : "monthly"

  // metadataからuser_idを取得（create-checkout APIでセットする）
  const userId = session.metadata?.user_id

  if (!userId) {
    // metadataにuser_idがない場合、メールアドレスからprofilesを検索
    console.warn("[Webhook] checkout.session.completed: no user_id in metadata, searching by email")

    if (!customerEmail) {
      console.error("[Webhook] checkout.session.completed: no user_id or email available")
      return
    }

    // auth.usersからメールで検索（admin client使用）
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error("[Webhook] Failed to list auth users:", authError)
      throw authError
    }

    const matchedUser = authUsers.users.find((u) => u.email === customerEmail)
    if (!matchedUser) {
      console.error(`[Webhook] No auth user found for email: ${customerEmail}`)
      return
    }

    // user_idが取得できたのでUPSERT
    await upsertSubscription(supabaseAdmin, {
      userId: matchedUser.id,
      customerId,
      subscriptionId,
      priceId: priceId || "",
      planType,
      billingInterval,
      status: subscription.status,
      currentPeriodStart: (() => {
        const p = getSubscriptionPeriod(subscription)
        return p.currentPeriodStart ? new Date(p.currentPeriodStart * 1000).toISOString() : null
      })(),
      currentPeriodEnd: (() => {
        const p = getSubscriptionPeriod(subscription)
        return p.currentPeriodEnd ? new Date(p.currentPeriodEnd * 1000).toISOString() : null
      })(),
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    })
    return
  }

  // metadataからuser_idが取得できた場合
  await upsertSubscription(supabaseAdmin, {
    userId,
    customerId,
    subscriptionId,
    priceId: priceId || "",
    planType,
    billingInterval,
    status: subscription.status,
    currentPeriodStart: (() => {
      const p = getSubscriptionPeriod(subscription)
      return p.currentPeriodStart ? new Date(p.currentPeriodStart * 1000).toISOString() : null
    })(),
    currentPeriodEnd: (() => {
      const p = getSubscriptionPeriod(subscription)
      return p.currentPeriodEnd ? new Date(p.currentPeriodEnd * 1000).toISOString() : null
    })(),
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  })
}

/**
 * customer.subscription.created ハンドラー
 *
 * サブスクリプション作成時にステータスを同期する。
 * checkout.session.completedとの順序不整合に対応するため、
 * UPSERTパターンで処理（§4-4）。
 */
export async function handleSubscriptionCreated(
  event: Stripe.Event,
  _stripe: Stripe,
  supabaseAdmin: AdminClient
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price?.id
  const planType = priceId ? planTypeFromPriceId(priceId) : "pro"
  const billingInterval = priceId ? intervalFromPriceId(priceId) : "monthly"

  // customer_idからsubscriptionsテーブルのuser_idを取得
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single()

  if (!existing?.user_id) {
    // checkout.session.completedがまだ処理されていない場合は
    // ログを残して200を返す（Checkoutハンドラー側でUPSERTされる）
    console.log(
      `[Webhook] subscription.created: no existing record for customer ${customerId}, ` +
        "checkout.session.completed will handle this"
    )
    return
  }

  await upsertSubscription(supabaseAdmin, {
    userId: existing.user_id,
    customerId,
    subscriptionId: subscription.id,
    priceId: priceId || "",
    planType,
    billingInterval,
    status: subscription.status,
    currentPeriodStart: (() => {
      const p = getSubscriptionPeriod(subscription)
      return p.currentPeriodStart ? new Date(p.currentPeriodStart * 1000).toISOString() : null
    })(),
    currentPeriodEnd: (() => {
      const p = getSubscriptionPeriod(subscription)
      return p.currentPeriodEnd ? new Date(p.currentPeriodEnd * 1000).toISOString() : null
    })(),
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  })
}

/**
 * customer.subscription.updated ハンドラー
 *
 * status, plan_type, period, cancel_at 等を同期する。
 * プラン変更、自動更新、解約スケジュールなどの更新に対応。
 */
export async function handleSubscriptionUpdated(
  event: Stripe.Event,
  _stripe: Stripe,
  supabaseAdmin: AdminClient
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price?.id
  const planType = priceId ? planTypeFromPriceId(priceId) : "free"
  const billingInterval = priceId ? intervalFromPriceId(priceId) : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    status: subscription.status,
    plan_type: planType,
    stripe_price_id: priceId || null,
    billing_interval: billingInterval,
    current_period_start: (() => {
      const p = getSubscriptionPeriod(subscription)
      return p.currentPeriodStart ? new Date(p.currentPeriodStart * 1000).toISOString() : null
    })(),
    current_period_end: (() => {
      const p = getSubscriptionPeriod(subscription)
      return p.currentPeriodEnd ? new Date(p.currentPeriodEnd * 1000).toISOString() : null
    })(),
    cancel_at: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update(updateData)
    .eq("stripe_customer_id", customerId)

  if (error) {
    console.error("[Webhook] subscription.updated: DB update failed:", error)
    throw error
  }

  console.log(
    `[Webhook] subscription.updated: customer=${customerId} ` +
      `status=${subscription.status} plan=${planType}`
  )

  // Slack通知: プラン変更
  const previousPlan = (event.data.previous_attributes as any)?.items?.data?.[0]?.price?.id
  if (previousPlan && previousPlan !== priceId) {
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, profiles(email)")
      .eq("stripe_customer_id", customerId)
      .single()
    const email = (sub as any)?.profiles?.email || customerId
    const oldPlanType = planTypeFromPriceId(previousPlan)
    notifyPlanChange({ userName: email, email, oldPlan: oldPlanType, newPlan: planType }).catch(() => {})
  }
}

/**
 * customer.subscription.deleted ハンドラー
 *
 * 解約完了処理。canceled_atを設定し、plan_typeをfreeにする（§5-3）。
 */
export async function handleSubscriptionDeleted(
  event: Stripe.Event,
  _stripe: Stripe,
  supabaseAdmin: AdminClient
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      plan_type: "free",
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
      app_status: "active", // Freeプランとしてアクティブに
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId)

  if (error) {
    console.error("[Webhook] subscription.deleted: DB update failed:", error)
    throw error
  }

  console.log(`[Webhook] subscription.deleted: customer=${customerId} → free`)

  // Slack通知: 解約
  const { data: canceledSub } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, profiles(email)")
    .eq("stripe_customer_id", customerId)
    .single()
  const cancelEmail = (canceledSub as any)?.profiles?.email || customerId
  const canceledPlan = subscription.items.data[0]?.price?.id
    ? planTypeFromPriceId(subscription.items.data[0].price.id)
    : "pro"
  notifySubscriptionCanceled({ userName: cancelEmail, email: cancelEmail, plan: canceledPlan }).catch(() => {})
}

// ============================================================
// Step 3: 請求書系ハンドラー（§4-2, §6-3, §6-4）
// ============================================================

/**
 * invoice.paid ハンドラー
 *
 * 入金確認。dunning解決、app_status→active復旧、
 * payment_failures.resolved_at更新（§6-4）。
 */
export async function handleInvoicePaid(
  event: Stripe.Event,
  _stripe: Stripe,
  supabaseAdmin: AdminClient
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer as string
  // Stripe v20+: subscription フィールドは型定義から削除されたが、webhookデータには含まれる
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptionId = ((invoice as any).subscription as string) || ""

  if (!subscriptionId) {
    console.log("[Webhook] invoice.paid: no subscription_id (one-time payment?), skipping")
    return
  }

  // subscriptionsのstatusとapp_statusを復旧
  const { error: subError } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "active",
      app_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId)

  if (subError) {
    console.error("[Webhook] invoice.paid: subscription update failed:", subError)
    throw subError
  }

  // payment_failuresの未解決レコードをresolvedに更新（§6-4）
  const { error: pfError } = await supabaseAdmin
    .from("payment_failures")
    .update({
      dunning_status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId)
    .is("resolved_at", null) // 未解決レコードのみ

  if (pfError) {
    // payment_failuresが存在しない場合はエラーにしない
    console.warn("[Webhook] invoice.paid: payment_failures update:", pfError.message)
  }

  console.log(`[Webhook] invoice.paid: customer=${customerId} → active, dunning resolved`)

  // TODO: Step 8でサービス復旧通知メール送信を追加
}

/**
 * invoice.payment_failed ハンドラー
 *
 * 未払い督促フロー開始。payment_failuresテーブル記録、
 * subscriptions.status→past_due（§6-3）。
 */
export async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  _stripe: Stripe,
  supabaseAdmin: AdminClient
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer as string
  // Stripe v20+: subscription フィールドは型定義から削除されたが、webhookデータには含まれる
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptionId = ((invoice as any).subscription as string) || ""

  if (!subscriptionId) {
    console.log("[Webhook] invoice.payment_failed: no subscription_id, skipping")
    return
  }

  // subscriptionsのstatusをpast_dueに更新
  const { error: subError } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId)

  if (subError) {
    console.error("[Webhook] invoice.payment_failed: subscription update failed:", subError)
    throw subError
  }

  // user_idを取得
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single()

  // payment_failuresテーブルに記録（§6-3）
  const attemptCount = invoice.attempt_count || 1
  const { error: pfError } = await supabaseAdmin.from("payment_failures").upsert(
    {
      user_id: sub?.user_id || null,
      stripe_subscription_id: subscriptionId,
      stripe_invoice_id: invoice.id,
      attempt_count: attemptCount,
      last_attempt_at: new Date().toISOString(),
      dunning_status: "active",
      failure_reason: invoice.last_finalization_error?.message || "Payment failed",
    },
    { onConflict: "stripe_invoice_id" }
  )

  if (pfError) {
    console.error("[Webhook] invoice.payment_failed: payment_failures upsert failed:", pfError)
    throw pfError
  }

  console.log(
    `[Webhook] invoice.payment_failed: customer=${customerId} ` +
      `attempt=${attemptCount} → past_due`
  )

  // Slack通知: 決済失敗
  const failEmail = sub?.user_id ? (await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", sub.user_id)
    .single()).data?.email || customerId : customerId
  notifyPaymentFailure({
    userName: failEmail,
    email: failEmail,
    plan: "unknown",
    amount: `¥${invoice.amount_due || 0}`,
    attemptCount,
    failureReason: invoice.last_finalization_error?.message || "Payment failed",
  }).catch(() => {})
}

/**
 * invoice.finalized ハンドラー
 *
 * 請求書確定。ログ記録のみ（将来拡張用スタブ）。
 */
export async function handleInvoiceFinalized(
  event: Stripe.Event,
  _stripe: Stripe,
  _supabaseAdmin: AdminClient
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  console.log(
    `[Webhook] invoice.finalized: invoice=${invoice.id} ` +
      `customer=${invoice.customer} amount=${invoice.amount_due}`
  )

  // 将来拡張: 請求書確定通知等
}

/**
 * customer.subscription.trial_will_end ハンドラー
 *
 * トライアル終了3日前通知（将来拡張用スタブ — §4-2 🟡推奨）。
 */
export async function handleTrialWillEnd(
  event: Stripe.Event,
  _stripe: Stripe,
  _supabaseAdmin: AdminClient
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription
  console.log(
    `[Webhook] trial_will_end: subscription=${subscription.id} ` +
      `customer=${subscription.customer} trial_end=${subscription.trial_end}`
  )

  // TODO: 将来トライアル機能実装時にメール通知を追加
}

// ============================================================
// 共通ヘルパー
// ============================================================

interface UpsertSubscriptionParams {
  userId: string
  customerId: string
  subscriptionId: string
  priceId: string
  planType: PlanType
  billingInterval: "monthly" | "yearly" | null
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  trialEnd: string | null
}

/**
 * subscriptionsテーブルへのUPSERT
 *
 * checkout.session.completed と customer.subscription.created の
 * 順序不整合に対応するため、user_idでUPSERTする（§4-4）。
 */
async function upsertSubscription(
  supabaseAdmin: AdminClient,
  params: UpsertSubscriptionParams
): Promise<void> {
  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: params.userId,
      stripe_customer_id: params.customerId,
      stripe_subscription_id: params.subscriptionId,
      stripe_price_id: params.priceId,
      plan_type: params.planType,
      billing_interval: params.billingInterval,
      status: params.status,
      app_status: "active",
      current_period_start: params.currentPeriodStart,
      current_period_end: params.currentPeriodEnd,
      trial_end: params.trialEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (error) {
    console.error("[Webhook] upsertSubscription failed:", error)
    throw error
  }

  console.log(
    `[Webhook] upsertSubscription: user=${params.userId} plan=${params.planType} ` +
      `status=${params.status}`
  )
}
