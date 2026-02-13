/**
 * Customer Portal セッション作成API
 *
 * POST: Stripe Billing Portalの一時URLを生成して返す。
 * ユーザーはこのURLでカード変更・請求書閲覧等を行う。
 *
 * @see stripe-payment-spec-v2.2.md §4-1
 */

import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/server'
import { applyRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証されていません' }, { status: 401 })
    }

    // 2. レート制限: 10回/分
    const rateLimitError = applyRateLimit(request, 'stripePortal', user.id)
    if (rateLimitError) return rateLimitError

    // 3. stripe_customer_idを取得
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripeカスタマー情報が見つかりません。まずプランをご契約ください。' },
        { status: 400 }
      )
    }

    // 4. Portal Session作成
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const stripe = getStripe()

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/account/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[create-portal] Error:', message)
    return NextResponse.json(
      { error: 'ポータルセッションの作成に失敗しました' },
      { status: 500 }
    )
  }
}
