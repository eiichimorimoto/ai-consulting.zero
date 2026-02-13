/**
 * サブスクリプション状態取得API
 *
 * GET: 現在のユーザーのサブスクリプション情報を返す。
 * Checkout成功ページのポーリングやダッシュボード表示に使用。
 *
 * @see stripe-payment-spec-v2.2.md §4-1
 */

import { createClient } from '@/lib/supabase/server'
import { applyRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 1. 認証チェック
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証されていません' }, { status: 401 })
    }

    // 2. レート制限: 30回/分
    const rateLimitError = applyRateLimit(request, 'stripeSubscriptionRead', user.id)
    if (rateLimitError) return rateLimitError

    // 3. subscriptionsテーブルから取得
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(
        'plan_type, status, app_status, billing_interval, current_period_start, current_period_end, cancel_at, canceled_at, trial_end, stripe_customer_id, stripe_subscription_id'
      )
      .eq('user_id', user.id)
      .single() as { data: {
        plan_type: string; status: string; app_status: string;
        billing_interval: string | null; current_period_start: string | null;
        current_period_end: string | null; cancel_at: string | null;
        canceled_at: string | null; trial_end: string | null;
        stripe_customer_id: string | null; stripe_subscription_id: string | null;
      } | null; error: { code?: string; message: string } | null }

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 = レコードなし（新規ユーザー）
      console.error('[subscription] DB error:', subError)
      return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
    }

    // 未契約の場合はFreeプランとして返す
    if (!subscription) {
      return NextResponse.json({
        subscription: {
          plan_type: 'free',
          status: 'active',
          app_status: 'active',
          billing_interval: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at: null,
          canceled_at: null,
          trial_end: null,
          has_stripe_subscription: false,
        },
      })
    }

    return NextResponse.json({
      subscription: {
        plan_type: subscription.plan_type,
        status: subscription.status,
        app_status: subscription.app_status,
        billing_interval: subscription.billing_interval,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at: subscription.cancel_at,
        canceled_at: subscription.canceled_at,
        trial_end: subscription.trial_end,
        has_stripe_subscription: !!subscription.stripe_subscription_id,
      },
    })
  } catch (error) {
    console.error('[subscription] Error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
