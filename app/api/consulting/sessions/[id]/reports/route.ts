/**
 * Consulting Session: ステップレポート一覧 API
 *
 * GET /api/consulting/sessions/[id]/reports
 * 当該セッションに紐づく consulting_step_reports 一覧を返す。セッション所有者のみ。
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
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
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const { data: reports, error: reportsError } = await supabase
      .from('consulting_step_reports')
      .select('id, session_id, step_round, title, content, content_markdown, created_at')
      .eq('session_id', sessionId)
      .order('step_round', { ascending: true })

    if (reportsError) {
      console.error('GET session reports error:', reportsError)
      return NextResponse.json(
        { error: reportsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reports: reports ?? [],
    })
  } catch (error) {
    console.error('GET /api/consulting/sessions/[id]/reports error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
