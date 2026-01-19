/**
 * Consulting Messages API
 * 
 * セッションのメッセージ履歴取得・送信
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/consulting/sessions/[id]/messages
 * 
 * セッションのメッセージ履歴を取得
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

    // セッション所有権確認
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('profile_id', profile.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // メッセージ取得
    const { data: messages, error: messagesError } = await supabase
      .from('consulting_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('message_order', { ascending: true })

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json(
        { error: messagesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      messages: messages || [],
      count: messages?.length || 0
    })

  } catch (error) {
    console.error('GET /api/consulting/sessions/[id]/messages error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/consulting/sessions/[id]/messages
 * 
 * ユーザーメッセージ送信 + Dify呼び出し + AI応答保存
 */
export async function POST(
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

    // リクエストボディ取得
    const body = await request.json()
    const { message } = body

    // バリデーション
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
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

    // セッション所有権確認＆情報取得
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('profile_id', profile.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // セッションがcompletedの場合はメッセージ送信不可
    if (session.status === 'completed' || session.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot send message to a closed session' },
        { status: 400 }
      )
    }

    // 現在のメッセージ数を取得（message_order計算のため）
    const { count: messageCount } = await supabase
      .from('consulting_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    const nextMessageOrder = (messageCount || 0) + 1

    // 1. ユーザーメッセージ保存
    const { data: userMessage, error: userMessageError } = await supabase
      .from('consulting_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
        message_order: nextMessageOrder
      })
      .select()
      .single()

    if (userMessageError) {
      console.error('User message save error:', userMessageError)
      return NextResponse.json(
        { error: userMessageError.message },
        { status: 500 }
      )
    }

    // 2. Dify呼び出し
    const difyStartTime = Date.now()
    
    let aiResponse: string
    let tokensUsed = 0
    let processingTime = 0

    try {
      // Dify Chat APIを呼び出し
      const difyResponse = await fetch(`${request.nextUrl.origin}/api/dify/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          message,
          userId: user.id
        })
      })

      if (!difyResponse.ok) {
        throw new Error(`Dify API error: ${difyResponse.statusText}`)
      }

      const difyData = await difyResponse.json()
      aiResponse = difyData.response || 'AI応答の取得に失敗しました。'
      tokensUsed = difyData.tokens_used || 0
      processingTime = Date.now() - difyStartTime

    } catch (difyError) {
      console.error('Dify API call error:', difyError)
      // Difyエラーの場合もフォールバックレスポンスを返す
      aiResponse = 'AI処理中にエラーが発生しました。しばらく経ってから再度お試しください。'
      processingTime = Date.now() - difyStartTime
    }

    // 3. AIレスポンス保存
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('consulting_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        message_order: nextMessageOrder + 1,
        tokens_used: tokensUsed,
        processing_time_ms: processingTime
      })
      .select()
      .single()

    if (aiMessageError) {
      console.error('AI message save error:', aiMessageError)
      return NextResponse.json(
        { error: aiMessageError.message },
        { status: 500 }
      )
    }

    // 4. セッションのcurrent_roundを更新
    const newRound = Math.floor((nextMessageOrder + 1) / 2)
    
    const { error: updateError } = await supabase
      .from('consulting_sessions')
      .update({ 
        current_round: newRound,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Session update error:', updateError)
      // 更新失敗してもメッセージは保存されているので続行
    }

    // 5. 往復回数上限チェック
    const isLimitReached = newRound >= session.max_rounds

    return NextResponse.json({ 
      userMessage,
      aiMessage,
      current_round: newRound,
      max_rounds: session.max_rounds,
      is_limit_reached: isLimitReached,
      message: isLimitReached 
        ? 'Maximum round limit reached. Session will be completed.'
        : 'Message sent successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/consulting/sessions/[id]/messages error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}
