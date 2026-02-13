/**
 * プラン変更 API
 * POST body: { planType: 'free' | 'pro' | 'enterprise' }
 * profiles.plan_type と subscriptions を更新する（決済は行わない簡易フロー）
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_PLANS = ['free', 'pro', 'enterprise'] as const

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証されていません' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const planType = typeof body.planType === 'string' ? body.planType.toLowerCase() : ''

    if (!ALLOWED_PLANS.includes(planType as typeof ALLOWED_PLANS[number])) {
      return NextResponse.json(
        { error: '無効なプランです。free / pro / enterprise のいずれかを指定してください。' },
        { status: 400 }
      )
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan_type: planType })
      .eq('user_id', user.id)

    if (profileError) {
      console.error('change-plan: profile update error', profileError)
      return NextResponse.json(
        { error: 'プロフィールの更新に失敗しました' },
        { status: 500 }
      )
    }

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert(
        { user_id: user.id, plan_type: planType, status: 'active' },
        { onConflict: 'user_id' }
      )

    if (subError) {
      console.error('change-plan: subscription upsert error', subError)
      return NextResponse.json(
        { error: 'サブスクリプションの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('change-plan error', e)
    return NextResponse.json(
      { error: 'プラン変更の処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
