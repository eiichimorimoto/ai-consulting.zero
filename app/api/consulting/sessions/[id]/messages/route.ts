/**
 * Consulting Messages API
 * 
 * セッションのメッセージ履歴取得・送信
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SUBCATEGORY_MAP, STEP_TITLES, STEP_GOALS } from '@/lib/consulting/constants'
import { CONSULTING_CATEGORIES } from '@/lib/consulting/category-data'
import { getPlanLimits } from '@/lib/plan-config'
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
    
    // 初回メッセージを動的生成（offset=0の場合のみ）
    let messagesWithInitial = reversedMessages
    if (offset === 0) {
      console.log('✅ Adding initial message dynamically (static master data)')
      const initialMessageTimestamp = reversedMessages.length > 0
        ? new Date(new Date(reversedMessages[0].created_at).getTime() - 1000).toISOString()
        : new Date().toISOString()
      
      messagesWithInitial = [
        {
          id: 'system-initial-message', // 固定ID（静的データ）
          session_id: sessionId,
          role: 'assistant' as const,
          content: 'どのような課題をお抱えですか？貴社の状況に合わせて、最適なアドバイスを提供いたします。',
          created_at: initialMessageTimestamp,
          message_order: 0,
          analysis_type: null,
          tokens_used: 0,
          processing_time: 0,
          attachments: null
        },
        ...reversedMessages
      ]
    }
    
    const mappedMessages = messagesWithInitial.map((msg, index) => {
      const baseMessage: any = {
        id: offset + index + 1, // グローバルなID
        type: msg.role === 'assistant' ? 'ai' : 'user',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }

      // 初回メッセージ（カテゴリ選択ボタン）の復元
      if (msg.role === 'assistant' && msg.content.includes('どのような課題をお抱えですか')) {
        console.log('✅ Category buttons restored for initial message')
        baseMessage.interactive = {
          type: 'category-buttons',
          data: CONSULTING_CATEGORIES
        }
      }

      // サブカテゴリは「カテゴリ選択の直後」の1通だけに表示。Dify回答の下には付けない。
      // 「さらに詳しくお聞かせください。具体的にはどのような課題でしょうか」を含む場合のみ復元
      const isSubcategoryPrompt =
        msg.role === 'assistant' &&
        typeof msg.content === 'string' &&
        msg.content.includes('さらに詳しくお聞かせください') &&
        msg.content.includes('どのような課題でしょうか');
      if (isSubcategoryPrompt && msg.analysis_type && SUBCATEGORY_MAP[msg.analysis_type]) {
        baseMessage.interactive = {
          type: 'subcategory-buttons',
          data: SUBCATEGORY_MAP[msg.analysis_type],
          selectedCategory: msg.analysis_type
        }
      }
      if (isSubcategoryPrompt && !baseMessage.interactive) {
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

    // デバッグ: レスポンスサマリー
    // 初回メッセージ（静的データ）を+1カウント
    // 注: 総メッセージ数はDB上のメッセージ数 + 1（初回メッセージ）
    const actualTotal = (count || 0) + 1
    console.log('📤 GET /messages Response:', {
      sessionId,
      db_messages: count,
      actual_total: actualTotal, // +1 (初回メッセージ)
      returned_messages: mappedMessages.length,
      has_interactive: mappedMessages.filter(m => m.interactive).length,
      first_message_type: mappedMessages[0]?.interactive?.type || 'none',
      initial_message_added: offset === 0
    })

    return NextResponse.json({ 
      messages: mappedMessages,
      total: actualTotal,
      hasMore: actualTotal > offset + limit,
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

    // 現在のSTEP（1始まり）。設計: step_round = current_round + 1、上限 max_rounds
    const currentRound = session.current_round ?? 0
    const maxRounds = session.max_rounds ?? 5
    const stepRound = Math.min(currentRound + 1, maxRounds)

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
          message_order: nextMessageOrder,
          step_round: stepRound
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

    // 1.5 プラン別の AI相談回数上限チェック（Enterprise は制限なし）
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type, monthly_chat_count')
      .eq('user_id', user.id)
      .single()

    const { maxTurnsTotal, isUnlimited } = getPlanLimits(profile?.plan_type as string | undefined)
    if (!isUnlimited && maxTurnsTotal != null) {
      const used = profile?.monthly_chat_count ?? 0
      const remaining = maxTurnsTotal - used
      if (remaining <= 0) {
        return NextResponse.json(
          {
            error: 'Chat limit exceeded',
            message: '今月のAI相談回数の上限に達しました。アカウントのプランをご覧ください。',
          },
          { status: 400 },
        )
      }
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
      // 通常のDify呼び出し（ユーザーメッセージをそのまま送信）
      const messageToSend = message
      try {
        const stepTitle = STEP_TITLES[stepRound - 1] ?? '';
        const stepGoal = STEP_GOALS[stepRound - 1] ?? '';
        const bodyPayload: Record<string, unknown> = {
          sessionId,
          message: messageToSend,
          userId: user.id,
          categoryInfo,
          stepRound,
          stepTitle,
          stepGoal,
        };
        if (conversationId) {
          bodyPayload.conversationId = conversationId;
        }
        const difyResponse = await fetch(`${request.nextUrl.origin}/api/dify/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        })

        if (!difyResponse.ok) {
          throw new Error(`Dify API error: ${difyResponse.statusText}`)
        }

        const difyData = await difyResponse.json()
        aiResponseContent = difyData.response || 'AI応答の取得に失敗しました。'
        tokensUsed = difyData.tokens_used || 0
        processingTime = Date.now() - difyStartTime
        newConversationId = difyData.conversation_id
      } catch (difyError) {
        console.error('Dify API call error:', difyError)
        aiResponseContent = 'AI処理中にエラーが発生しました。しばらく経ってから再度お試しください。'
        processingTime = Date.now() - difyStartTime
      }
    }

    // 3. AIレスポンス保存（1件）
    const aiMessageOrder = isInitialMessageDuplicate ? 2 : nextMessageOrder + 1

    let aiMessage: { id: string; content: string; role: string; created_at: string; message_order: number; analysis_type?: string | null; tokens_used?: number; processing_time_ms?: number }
    const aiMessageData: any = {
      session_id: sessionId,
      role: 'assistant',
      content: aiResponseContent,
      message_order: aiMessageOrder,
      tokens_used: tokensUsed,
      processing_time_ms: processingTime,
      step_round: stepRound
    }
    if (categoryInfo?.selectedCategory) {
      aiMessageData.analysis_type = categoryInfo.selectedCategory
    }
    const { data: inserted, error: aiMessageError } = await supabase
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
    aiMessage = inserted

    // 4. セッションの updated_at と conversation_id のみ更新（current_round は「このステップを終了」でだけ更新）
    const updateData: any = {
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

    // 4.5 利用カウント加算（実際に Dify を呼び出した場合のみ。skipDify の場合は加算しない）
    if (!(skipDify && aiResponse)) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('monthly_chat_count')
        .eq('id', user.id)
        .single()
      const nextChatCount = (profileRow?.monthly_chat_count ?? 0) + 1
      await supabase
        .from('profiles')
        .update({ monthly_chat_count: nextChatCount })
        .eq('id', user.id)
    }

    // 5. 往復回数上限チェック（current_round は DB の現在値のまま。currentRound は上で定義済み）
    const isLimitReached = currentRound >= (session.max_rounds ?? 5)

    // 6. 更新されたセッション情報とメッセージ一覧を返す（current_round は変更しない）
    const updatedSession = {
      ...session,
      updated_at: new Date().toISOString()
    }

    // 全件のメッセージを作成（既存 + 新規の user + AI 1件）
    const allMessages = [
      ...(existingMessages || []),
      userMessage,
      aiMessage,
    ].filter((msg, index, self) =>
      index === self.findIndex(m => m.id === msg.id)
    )

    // 初期メッセージを動的に挿入（GET /messages と同じロジック）
    const initialMessageTimestamp = new Date(session.created_at).toISOString()
    const messagesWithInitial = {
      messages: [
        {
          id: crypto.randomUUID(),
          session_id: sessionId,
          role: 'assistant' as const,
          content: 'どのような課題をお抱えですか？貴社の状況に合わせて、最適なアドバイスを提供いたします。',
          created_at: initialMessageTimestamp,
          message_order: 0,
          analysis_type: null,
          tokens_used: 0,
          processing_time: 0,
          attachments: null
        },
        ...allMessages
      ]
    }

    // Supabaseのrole → フロントエンドのtype にマッピング
    const mappedMessages = messagesWithInitial.messages.map((msg, index) => {
      const baseMessage: any = {
        id: index + 1,
        type: msg.role === 'assistant' ? 'ai' : 'user',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }

      // 初回メッセージ（カテゴリ選択ボタン）の復元
      if (msg.role === 'assistant' && msg.content.includes('どのような課題をお抱えですか')) {
        console.log('✅ Category buttons restored for initial message (POST)')
        baseMessage.interactive = {
          type: 'category-buttons',
          data: CONSULTING_CATEGORIES
        }
      }

      // サブカテゴリは「カテゴリ選択の直後」の1通だけ（POST応答でも同条件）
      const isSubcategoryPromptPost =
        msg.role === 'assistant' &&
        typeof msg.content === 'string' &&
        msg.content.includes('さらに詳しくお聞かせください') &&
        msg.content.includes('どのような課題でしょうか');
      if (isSubcategoryPromptPost && msg.analysis_type && SUBCATEGORY_MAP[msg.analysis_type]) {
        baseMessage.interactive = {
          type: 'subcategory-buttons',
          data: SUBCATEGORY_MAP[msg.analysis_type],
          selectedCategory: msg.analysis_type
        }
      }
      if (isSubcategoryPromptPost && !baseMessage.interactive) {
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
      current_round: currentRound,
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
      round: currentRound,
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
