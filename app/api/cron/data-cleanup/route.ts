/**
 * 解約データ削除 Cron Job
 *
 * 毎日3:00 UTC実行。
 * canceled_at > 30日のユーザーデータを削除する。
 *
 * 削除対象: consulting_sessions, consulting_messages, reports
 * 保持: profiles, subscriptions, cancellation_reasons（分析用）
 *
 * CRON_SECRETヘッダーで認証する。
 *
 * @see stripe-payment-spec-v2.2.md §5-3, §6-8
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // CRON_SECRET認証
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const results = { users_processed: 0, sessions_deleted: 0, messages_deleted: 0, reports_deleted: 0, errors: 0 }

  try {
    // canceled_at が30日以上前のサブスクリプションを検索
    const { data: canceledSubs, error } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, canceled_at')
      .eq('status', 'canceled')
      .lt('canceled_at', thirtyDaysAgo.toISOString())
      .not('canceled_at', 'is', null)

    if (error) {
      console.error('[data-cleanup] Failed to fetch canceled subscriptions:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    if (!canceledSubs || canceledSubs.length === 0) {
      return NextResponse.json({ message: 'No data to clean up', ...results })
    }

    for (const sub of canceledSubs) {
      results.users_processed++

      try {
        // consulting_messagesを削除（consulting_sessionsのFKに依存）
        // まずユーザーのセッションIDを取得
        const { data: sessions } = await supabaseAdmin
          .from('consulting_sessions')
          .select('id')
          .eq('user_id', sub.user_id)

        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map((s) => s.id)

          // メッセージ削除
          const { count: msgCount } = await supabaseAdmin
            .from('consulting_messages')
            .delete({ count: 'exact' })
            .in('session_id', sessionIds)

          results.messages_deleted += msgCount || 0

          // セッション削除
          const { count: sessCount } = await supabaseAdmin
            .from('consulting_sessions')
            .delete({ count: 'exact' })
            .eq('user_id', sub.user_id)

          results.sessions_deleted += sessCount || 0
        }

        // レポート削除
        const { count: reportCount } = await supabaseAdmin
          .from('reports')
          .delete({ count: 'exact' })
          .eq('user_id', sub.user_id)

        results.reports_deleted += reportCount || 0
      } catch (err) {
        console.error(`[data-cleanup] Error cleaning up user ${sub.user_id}:`, err)
        results.errors++
      }
    }

    console.log('[data-cleanup] Results:', results)
    return NextResponse.json(results)
  } catch (err) {
    console.error('[data-cleanup] Fatal error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
