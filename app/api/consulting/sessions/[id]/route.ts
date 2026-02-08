/**
 * Consulting Session Detail API
 * 
 * 特定セッションの取得・更新・削除
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/consulting/sessions/[id]
 * 
 * 特定セッションの詳細を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: sessionId } = await params

    // セッション取得（所有権確認を含む）
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }
      console.error('Session fetch error:', sessionError)
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ session })

  } catch (error) {
    console.error('GET /api/consulting/sessions/[id] error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/consulting/sessions/[id]
 * 
 * セッション更新（status, current_round等）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: sessionId } = await params

    // セッション所有権確認（current_round 更新時の検証用に current_round, max_rounds も取得）
    const { data: existingSession, error: checkError } = await supabase
      .from('consulting_sessions')
      .select('id, current_round, max_rounds')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // リクエストボディ取得
    const body = await request.json()
    const {
      title,
      status,
      current_round,
      analysis_summary,
      key_insights,
      recommendations,
      completed_at
    } = body

    // ステータスのバリデーション
    if (status !== undefined && !['active', 'completed', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, completed, archived' },
        { status: 400 }
      )
    }

    // current_round は「戻る」のみ許可（進捗を先に進めることはできない）
    if (current_round !== undefined) {
      const existingRound = existingSession.current_round ?? 0
      const maxRounds = existingSession.max_rounds ?? 5
      if (typeof current_round !== 'number' || current_round < 0 || current_round > maxRounds) {
        return NextResponse.json(
          { error: 'Invalid current_round. Must be 0 to max_rounds.' },
          { status: 400 }
        )
      }
      if (current_round > existingRound) {
        return NextResponse.json(
          { error: 'Cannot advance current_round via PATCH. Use complete-step to advance.' },
          { status: 400 }
        )
      }
    }

    // 更新データ準備
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (status !== undefined) updateData.status = status
    if (current_round !== undefined) updateData.current_round = current_round
    if (analysis_summary !== undefined) updateData.analysis_summary = analysis_summary
    if (key_insights !== undefined) updateData.key_insights = key_insights
    if (recommendations !== undefined) updateData.recommendations = recommendations
    if (completed_at !== undefined) updateData.completed_at = completed_at

    // ステータスがcompletedになった場合、completed_atを自動設定
    if (status === 'completed' && !completed_at) {
      updateData.completed_at = new Date().toISOString()
    }
    
    console.log(`✅ Session ${sessionId} status updated to: ${status || 'unchanged'}`)

    // セッション更新
    const { data: session, error: updateError } = await supabase
      .from('consulting_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('Session update error:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      session,
      message: 'Session updated successfully'
    })

  } catch (error) {
    console.error('PATCH /api/consulting/sessions/[id] error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/consulting/sessions/[id]
 * 
 * セッション削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: sessionId } = await params

    // セッション削除（所有権確認を含む）
    const { error: deleteError } = await supabase
      .from('consulting_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Session delete error:', deleteError)
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('DELETE /api/consulting/sessions/[id] error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}
