/**
 * 手動再請求API
 *
 * POST body: { invoice_id?: string }
 *
 * 支払い方法更新後に手動で再請求をトリガーする。
 * 成功時は invoice.paid Webhook で復旧フローが自動実行される。
 *
 * @see stripe-payment-spec-v2.2.md §6-5
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
    const rateLimitError = applyRateLimit(request, "stripeRetryPayment", user.id)
    if (rateLimitError) return rateLimitError

    // 3. リクエストボディ
    const body = await request.json().catch(() => ({}))
    const invoiceId = body.invoice_id as string | undefined

    // 4. stripe_customer_idを取得
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "サブスクリプション情報が見つかりません。" },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    // 5. invoice_idが指定されている場合は直接再請求
    if (invoiceId) {
      const invoice = await stripe.invoices.pay(invoiceId)
      return NextResponse.json({
        success: true,
        invoice_status: invoice.status,
        message: "再請求を実行しました。",
      })
    }

    // 6. invoice_idが未指定の場合、最新の未払い請求書を検索して再請求
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      status: "open",
      limit: 1,
    })

    if (invoices.data.length === 0) {
      return NextResponse.json({ error: "未払いの請求書が見つかりません。" }, { status: 404 })
    }

    const latestInvoice = invoices.data[0]
    const paidInvoice = await stripe.invoices.pay(latestInvoice.id)

    return NextResponse.json({
      success: true,
      invoice_id: paidInvoice.id,
      invoice_status: paidInvoice.status,
      message: "再請求を実行しました。",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[retry-payment] Error:", message)

    // Stripe決済エラーの場合は詳細を返す
    if (error && typeof error === "object" && "type" in error) {
      const stripeError = error as { type: string; message: string }
      if (stripeError.type === "StripeCardError") {
        return NextResponse.json(
          {
            error: "再請求に失敗しました。支払い方法を更新してから再度お試しください。",
            detail: stripeError.message,
          },
          { status: 402 }
        )
      }
    }

    return NextResponse.json({ error: "再請求の処理に失敗しました" }, { status: 500 })
  }
}
