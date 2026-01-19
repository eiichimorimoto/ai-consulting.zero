/**
 * Consulting Sessions API
 * 
 * 相談セッションの一覧取得・新規作成
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/consulting/sessions
 * 
 * ユーザーの相談セッション一覧を取得
 */
export async function GET(request: NextRequest) {
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

    // セッション一覧取得
    const { data: sessions, error: sessionsError } = await supabase
      .from('consulting_sessions')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError)
      return NextResponse.json(
        { error: sessionsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      sessions: sessions || [],
      count: sessions?.length || 0
    })

  } catch (error) {
    console.error('GET /api/consulting/sessions error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/consulting/sessions
 * 
 * 新規相談セッション作成
 */
export async function POST(request: NextRequest) {
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

    // リクエストボディ取得
    const body = await request.json()
    const { title, category, initial_message } = body

    // バリデーション
    if (!initial_message || initial_message.trim().length === 0) {
      return NextResponse.json(
        { error: 'initial_message is required' },
        { status: 400 }
      )
    }

    // ユーザープロフィール取得（profile_id, company_id取得のため）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    if (!profile.company_id) {
      return NextResponse.json(
        { error: 'Company information required' },
        { status: 400 }
      )
    }

    // セッション作成
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .insert({
        profile_id: profile.id,
        company_id: profile.company_id,
        title: title || initial_message.slice(0, 50) + '...',
        category: category || 'general',
        status: 'active',
        max_rounds: 5,
        current_round: 0
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      )
    }

    // 初期メッセージ保存
    const { error: messageError } = await supabase
      .from('consulting_messages')
      .insert({
        session_id: session.id,
        role: 'user',
        content: initial_message,
        message_order: 1
      })

    if (messageError) {
      console.error('Initial message save error:', messageError)
      // セッションは作成されたが、メッセージ保存に失敗した場合
      // セッションはそのまま返す（後でメッセージを追加可能）
      console.warn('Session created but initial message failed to save')
    }

    return NextResponse.json({ 
      session,
      message: 'Session created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/consulting/sessions error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}
