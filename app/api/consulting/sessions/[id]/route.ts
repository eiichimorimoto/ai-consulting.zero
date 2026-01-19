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

    // ユーザーのprofile_idを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // セッション取得（所有権確認を含む）
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('profile_id', profile.id)
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

    // ユーザーのprofile_idを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // セッション所有権確認
    const { data: existingSession, error: checkError } = await supabase
      .from('consulting_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('profile_id', profile.id)
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

    // ユーザーのprofile_idを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // セッション削除（所有権確認を含む）
    const { error: deleteError } = await supabase
      .from('consulting_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('profile_id', profile.id)

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
