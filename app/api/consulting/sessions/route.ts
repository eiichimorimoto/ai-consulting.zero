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

    // セッション一覧取得
    const { data: sessions, error: sessionsError } = await supabase
      .from('consulting_sessions')
      .select('*')
      .eq('user_id', user.id)
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

    // ユーザープロフィール取得（company_id取得のため）
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    // セッション作成
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .insert({
        user_id: user.id,
        company_id: profile?.company_id || null,
        title: title || (initial_message ? initial_message.slice(0, 50) + '...' : '新規相談'),
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

    // 初期メッセージは保存しない（メッセージAPI経由で送信される）
    // これにより、Difyへの送信もメッセージAPI経由で一元管理される

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
