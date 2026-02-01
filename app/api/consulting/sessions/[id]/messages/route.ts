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

    // セッション所有権確認
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
    const { message, conversationId } = body

    // バリデーション
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    // セッション所有権確認＆情報取得
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
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
    const { data: existingMessages, count: messageCount } = await supabase
      .from('consulting_messages')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)
      .order('message_order', { ascending: true })

    const nextMessageOrder = (messageCount || 0) + 1

    // 1. ユーザーメッセージ保存
    // 初回メッセージ（message_order=1）が既に存在し、かつ内容が同じ場合はスキップ
    let userMessage
    const firstMessage = existingMessages?.[0]
    const isInitialMessageDuplicate = 
      firstMessage && 
      firstMessage.role === 'user' && 
      firstMessage.content === message &&
      messageCount === 1

    if (isInitialMessageDuplicate) {
      // 既存の初回メッセージを使用（重複保存を防ぐ）
      userMessage = firstMessage
      console.log('Initial message already exists, skipping duplicate save')
    } else {
      // 新しいメッセージを保存
      const { data: newMessage, error: userMessageError } = await supabase
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
      
      userMessage = newMessage
    }

    // 2. Dify呼び出し
    const difyStartTime = Date.now()
    
    let aiResponse: string
    let tokensUsed = 0
    let processingTime = 0
    let newConversationId: string | undefined

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
          userId: user.id,
          conversationId  // Dify会話履歴用
        })
      })

      if (!difyResponse.ok) {
        throw new Error(`Dify API error: ${difyResponse.statusText}`)
      }

      const difyData = await difyResponse.json()
      aiResponse = difyData.response || 'AI応答の取得に失敗しました。'
      tokensUsed = difyData.tokens_used || 0
      processingTime = Date.now() - difyStartTime
      newConversationId = difyData.conversation_id  // Difyから返ってきたconversation_id

    } catch (difyError) {
      console.error('Dify API call error:', difyError)
      // Difyエラーの場合もフォールバックレスポンスを返す
      aiResponse = 'AI処理中にエラーが発生しました。しばらく経ってから再度お試しください。'
      processingTime = Date.now() - difyStartTime
    }

    // 3. AIレスポンス保存
    // AI応答のmessage_orderは、重複チェック結果に応じて調整
    const aiMessageOrder = isInitialMessageDuplicate ? 2 : nextMessageOrder + 1
    
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('consulting_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        message_order: aiMessageOrder,
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
    // 重複チェックの結果に応じてround数を調整
    const newRound = isInitialMessageDuplicate ? 1 : Math.floor((nextMessageOrder + 1) / 2)
    
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

    // 6. 更新されたセッション情報とメッセージ一覧を返す
    const updatedSession = {
      ...session,
      current_round: newRound,
      updated_at: new Date().toISOString()
    }

    const responseData = { 
      session: updatedSession,
      messages: [userMessage, aiMessage],
      current_round: newRound,
      max_rounds: session.max_rounds,
      is_limit_reached: isLimitReached,
      conversation_id: newConversationId,  // フロントエンドに返す
      message: isLimitReached 
        ? 'Maximum round limit reached. Session will be completed.'
        : 'Message sent successfully'
    }
    
    console.log('POST /messages response:', JSON.stringify({
      conversation_id: responseData.conversation_id,
      has_conversation_id: !!responseData.conversation_id
    }))
    
    return NextResponse.json(responseData, { status: 201 })

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
