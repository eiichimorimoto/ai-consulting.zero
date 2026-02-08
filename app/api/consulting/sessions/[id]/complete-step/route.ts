/**
 * Consulting Session: ステップ終了 API
 *
 * POST /api/consulting/sessions/[id]/complete-step
 * 現在のステップを終了し、当該ステップのコンセンサスレポートを生成・保存してから current_round を 1 増やす。セッション所有者のみ。
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getMessagesByStepRound, formatCollectedConversation } from '@/lib/consulting/conversation-collector'
import { STEP_TITLES } from '@/lib/consulting/constants'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: sessionId } = await params

    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .select('id, current_round, max_rounds, max_reached_round, updated_at')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const currentRound = session.current_round ?? 0
    const maxRounds = session.max_rounds ?? 5
    if (currentRound >= maxRounds) {
      return NextResponse.json(
        { error: 'Already at final step' },
        { status: 400 }
      )
    }

    // 終了するステップ（1始まり）
    const completedStepRound = currentRound + 1
    const stepTitle = STEP_TITLES[completedStepRound - 1] ?? `STEP ${completedStepRound}`
    const reportTitle = `STEP ${completedStepRound} ${stepTitle} コンセンサスレポート`

    // 当該 step_round のメッセージを取得してレポート本文を生成
    const messages = await getMessagesByStepRound(supabase, sessionId, completedStepRound)
    const conversationText = formatCollectedConversation(messages)
    const contentMarkdown = [
      `# ${reportTitle}`,
      '',
      '## 会話ログ',
      '',
      conversationText || '（会話なし）',
    ].join('\n')
    const contentPlain = conversationText || '（会話なし）'

    // consulting_step_reports に保存（同一 session_id + step_round は UNIQUE のため upsert）
    const { error: reportError } = await supabase
      .from('consulting_step_reports')
      .upsert(
        {
          session_id: sessionId,
          step_round: completedStepRound,
          title: reportTitle,
          content: contentPlain,
          content_markdown: contentMarkdown,
        },
        { onConflict: 'session_id,step_round' } // UNIQUE (session_id, step_round) に合わせる
      )

    if (reportError) {
      console.error('complete-step report save error:', reportError)
      return NextResponse.json(
        { error: reportError.message },
        { status: 500 }
      )
    }

    const newRound = currentRound + 1
    const updatedAt = new Date().toISOString()
    const currentMaxReached = session.max_reached_round ?? 0
    const newMaxReached = Math.max(currentMaxReached, newRound)

    const { data: updated, error: updateError } = await supabase
      .from('consulting_sessions')
      .update({
        current_round: newRound,
        max_reached_round: newMaxReached,
        updated_at: updatedAt,
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('complete-step update error:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      session: updated,
      current_round: newRound,
    })
  } catch (error) {
    console.error('POST /api/consulting/sessions/[id]/complete-step error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
