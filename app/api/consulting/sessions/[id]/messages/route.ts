/**
 * Consulting Messages API
 * 
 * セッションのメッセージ履歴取得・送信
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SUBCATEGORY_MAP } from '@/lib/consulting/constants'
import { CONSULTING_CATEGORIES } from '@/lib/consulting/category-data'

/**
 * GET /api/consulting/sessions/[id]/messages
 * 
 * セッションのメッセージ履歴を取得（ページネーション対応）
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
    const { searchParams } = new URL(request.url)
    
    // ページネーションパラメータ（デフォルト: 最新50件）
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100) // 最大100件
    const offset = Number(searchParams.get('offset')) || 0

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

    // 総メッセージ数取得
    const { count, error: countError } = await supabase
      .from('consulting_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    if (countError) {
      console.error('Count error:', countError)
      return NextResponse.json(
        { error: countError.message },
        { status: 500 }
      )
    }

    // メッセージ取得（新しい順でrange指定）
    const { data: messages, error: messagesError } = await supabase
      .from('consulting_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }) // 新しい順
      .range(offset, offset + limit - 1)

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json(
        { error: messagesError.message },
        { status: 500 }
      )
    }

    // 表示用に古い順に並び替え & マッピング
    const reversedMessages = (messages || []).reverse()
    const mappedMessages = reversedMessages.map((msg, index) => {
      const baseMessage: any = {
        id: offset + index + 1, // グローバルなID
        type: msg.role === 'assistant' ? 'ai' : 'user',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }

      // 初回メッセージ（カテゴリ選択ボタン）の復元
      if (msg.role === 'assistant' && msg.content.includes('どのような課題をお抱えですか')) {
        baseMessage.interactive = {
          type: 'category-buttons',
          data: CONSULTING_CATEGORIES
        }
      }

      // サブカテゴリ選択メッセージの復元（analysis_typeベース）
      if (msg.role === 'assistant' && msg.analysis_type && SUBCATEGORY_MAP[msg.analysis_type]) {
        baseMessage.interactive = {
          type: 'subcategory-buttons',
          data: SUBCATEGORY_MAP[msg.analysis_type],
          selectedCategory: msg.analysis_type
        }
      }
      
      // 既存データ対応: 内容から推測してinteractiveを復元
      if (msg.role === 'assistant' && !msg.analysis_type && !baseMessage.interactive) {
        const categoryMatch = msg.content.match(/「(.+?)」について/)
        if (categoryMatch && SUBCATEGORY_MAP[categoryMatch[1]]) {
          baseMessage.interactive = {
            type: 'subcategory-buttons',
            data: SUBCATEGORY_MAP[categoryMatch[1]],
            selectedCategory: categoryMatch[1]
          }
        }
      }

      return baseMessage
    })

    return NextResponse.json({ 
      messages: mappedMessages,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
      offset,
      limit
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
    const { message, conversationId, skipDify, aiResponse, categoryInfo } = body

    console.log('📥 POST /messages - Received:', {
      sessionId,
      has_message: !!message,
      has_conversationId: !!conversationId,
      conversationId: conversationId || 'null',
      skipDify: skipDify || false,
      has_aiResponse: !!aiResponse,
      has_categoryInfo: !!categoryInfo
    })

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

    // 2. Dify呼び出し（skipDify=trueの場合はスキップ）
    const difyStartTime = Date.now()
    
    let aiResponseContent: string
    let tokensUsed = 0
    let processingTime = 0
    let newConversationId: string | undefined

    if (skipDify && aiResponse) {
      // Difyをスキップして、リクエストボディのaiResponseを使用
      aiResponseContent = aiResponse
      processingTime = Date.now() - difyStartTime
      console.log('📝 Dify skipped - using provided aiResponse')
    } else {
      // 通常のDify呼び出し
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
            conversationId,  // Dify会話履歴用
            categoryInfo     // カテゴリ情報をDifyに渡す
          })
        })

        if (!difyResponse.ok) {
          throw new Error(`Dify API error: ${difyResponse.statusText}`)
        }

        const difyData = await difyResponse.json()
        aiResponseContent = difyData.response || 'AI応答の取得に失敗しました。'
        tokensUsed = difyData.tokens_used || 0
        processingTime = Date.now() - difyStartTime
        newConversationId = difyData.conversation_id  // Difyから返ってきたconversation_id

      } catch (difyError) {
        console.error('Dify API call error:', difyError)
        // Difyエラーの場合もフォールバックレスポンスを返す
        aiResponseContent = 'AI処理中にエラーが発生しました。しばらく経ってから再度お試しください。'
        processingTime = Date.now() - difyStartTime
      }
    }

    // 3. AIレスポンス保存
    // AI応答のmessage_orderは、重複チェック結果に応じて調整
    const aiMessageOrder = isInitialMessageDuplicate ? 2 : nextMessageOrder + 1
    
    // AIメッセージのinsertデータを構築
    const aiMessageData: any = {
      session_id: sessionId,
      role: 'assistant',
      content: aiResponseContent,
      message_order: aiMessageOrder,
      tokens_used: tokensUsed,
      processing_time_ms: processingTime
    }

    // カテゴリ情報があればanalysis_typeに保存
    if (categoryInfo?.selectedCategory) {
      aiMessageData.analysis_type = categoryInfo.selectedCategory
    }

    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('consulting_messages')
      .insert(aiMessageData)
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
    
    // conversation_idがあれば保存（Difyの会話履歴を維持）
    const updateData: any = {
      current_round: newRound,
      updated_at: new Date().toISOString()
    }
    
    if (newConversationId) {
      updateData.conversation_id = newConversationId
    }
    
    const { error: updateError } = await supabase
      .from('consulting_sessions')
      .update(updateData)
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

    // 全件のメッセージを作成（既存 + 新規2件）
    const allMessages = [
      ...(existingMessages || []),
      userMessage,
      aiMessage
    ].filter((msg, index, self) => 
      // 重複除去: 同じidのメッセージは最後のものだけを残す
      index === self.findIndex(m => m.id === msg.id)
    )

    // Supabaseのrole → フロントエンドのtype にマッピング
    const mappedMessages = allMessages.map((msg, index) => {
      const baseMessage: any = {
        id: index + 1,
        type: msg.role === 'assistant' ? 'ai' : 'user',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }

      // カテゴリ選択メッセージの場合、interactiveを復元
      if (msg.role === 'assistant' && msg.analysis_type && SUBCATEGORY_MAP[msg.analysis_type]) {
        baseMessage.interactive = {
          type: 'subcategory-buttons',
          data: SUBCATEGORY_MAP[msg.analysis_type],
          selectedCategory: msg.analysis_type
        }
      }
      
      // 既存データ対応: 内容から推測してinteractiveを復元
      if (msg.role === 'assistant' && !msg.analysis_type) {
        const categoryMatch = msg.content.match(/「(.+?)」について/)
        if (categoryMatch && SUBCATEGORY_MAP[categoryMatch[1]]) {
          baseMessage.interactive = {
            type: 'subcategory-buttons',
            data: SUBCATEGORY_MAP[categoryMatch[1]],
            selectedCategory: categoryMatch[1]
          }
        }
      }

      return baseMessage
    })

    const responseData = { 
      session: updatedSession,
      messages: mappedMessages,  // マッピング済みの全件を返す
      current_round: newRound,
      max_rounds: session.max_rounds,
      is_limit_reached: isLimitReached,
      conversation_id: newConversationId,  // フロントエンドに返す
      message: isLimitReached 
        ? 'Maximum round limit reached. Session will be completed.'
        : 'Message sent successfully'
    }
    
    console.log('📤 POST /messages Response:', {
      has_conversation_id: !!responseData.conversation_id,
      conversation_id: responseData.conversation_id || 'null',
      message_count: responseData.messages.length,
      round: newRound,
      mapped_messages: responseData.messages.length
    })
    
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
