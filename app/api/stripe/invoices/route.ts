/**
 * 請求書一覧取得API
 *
 * GET: Stripe APIから直接請求書一覧を取得して返す。
 * hosted_invoice_url, invoice_pdf を含む。
 *
 * DBに請求書データは保存しない（§4-2注記 — Stripe APIから都度取得）。
 *
 * @see stripe-payment-spec-v2.2.md §4-1, §4-2
 */

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { applyRateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
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

    // 2. レート制限: 15回/分
    const rateLimitError = applyRateLimit(request, "stripeInvoicesRead", user.id)
    if (rateLimitError) return rateLimitError

    // 3. stripe_customer_idを取得
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] })
    }

    // 4. Stripe APIから請求書一覧を取得
    const stripe = getStripe()
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 24, // 直近2年分（月次）
    })

    // 5. 必要な情報のみ抽出して返す
    const formattedInvoices = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
      created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
    }))

    return NextResponse.json({ invoices: formattedInvoices })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[invoices] Error:", message)
    return NextResponse.json({ error: "請求書の取得に失敗しました" }, { status: 500 })
  }
}
