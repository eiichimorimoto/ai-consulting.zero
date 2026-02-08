/**
 * Consulting Messages API
 * 
 * セッションのメッセージ履歴取得・送信
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SUBCATEGORY_MAP } from '@/lib/consulting/constants'
import { CONSULTING_CATEGORIES } from '@/lib/consulting/category-data'
import {
  isReportRequest,
  isConfirmation,
  buildEchoReply,
  buildReportCreatedReply,
  isEchoReplyContent,
  isReportCreatedContent,
  extractReportTargetReference,
  findAssistantMessageByReference,
  isDiscussionSummaryReportRequest,
  buildDiscussionSummaryEchoReply,
  isPendingDiscussionSummary,
  unwrapPendingDiscussionSummaryQuery,
  PENDING_DISCUSSION_SUMMARY_PREFIX,
  extractDiscussionSummaryTheme,
  isPendingUserTopic,
  unwrapPendingUserTopic,
  wrapPendingUserTopic,
} from '@/lib/consulting/report-request'
import {
  collectMessagesByTheme,
  formatCollectedConversation,
  getAllSessionMessages,
} from '@/lib/consulting/conversation-collector'

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

    // レポート要求フロー: 復唱 or 確認後にDifyでレポート内容取得
    const pendingQuery = (session as { pending_report_query?: string | null }).pending_report_query ?? null
    const isConfirm = isConfirmation(message)
    const isReportReq = isReportRequest(message)
    const isDiscussionSummaryReq = isDiscussionSummaryReportRequest(message)
    const useDiscussionSummaryEcho = !pendingQuery && isDiscussionSummaryReq
    const useReportEcho = !pendingQuery && isReportReq && !useDiscussionSummaryEcho
    const useEchoReply = useDiscussionSummaryEcho || useReportEcho
    // 通常レポート依頼時: 「何々の内容をレポートに」なら会話を遡って何々に該当するAI回答を特定。それ以外は直前一件
    const assistantMessages = (existingMessages || [])
      .filter((m: { role: string }) => m.role === 'assistant')
      .map((m: { content: string }) => ({ content: m.content }))
    const latestAssistant = existingMessages?.length
      ? [...existingMessages].reverse().find((m: { role: string }) => m.role === 'assistant')
      : null
    const latestAiContent = latestAssistant?.content?.trim() ? (latestAssistant as { content: string }).content : null
    const reportTargetRef = useReportEcho ? extractReportTargetReference(message) : null
    const matchedByRef =
      reportTargetRef && assistantMessages.length > 0
        ? findAssistantMessageByReference(assistantMessages, reportTargetRef, { titleOnly: true })
        : null
    const reportTargetContent = matchedByRef?.content?.trim()
      ? matchedByRef.content
      : latestAiContent

    // pending が無い場合の復旧: 直直前のAIが復唱なら、その1つ前のAI回答をレポート対象としてDifyに送る
    let recoveredReportTarget: string | null = null
    if (isConfirm && !pendingQuery && (existingMessages?.length ?? 0) >= 2) {
      const assistants = existingMessages!.filter((m: { role: string }) => m.role === 'assistant')
      const lastAssistant = assistants[assistants.length - 1] as { content: string } | undefined
      if (lastAssistant?.content && isEchoReplyContent(lastAssistant.content.trim())) {
        const prevAssistant = assistants[assistants.length - 2] as { content: string } | undefined
        if (prevAssistant?.content?.trim()) recoveredReportTarget = prevAssistant.content.trim()
      }
    }
    const effectivePending = pendingQuery || recoveredReportTarget
    const treatAsReportConfirm = !!(effectivePending && isConfirm)
    const isDiscussionSummaryConfirm = treatAsReportConfirm && pendingQuery ? isPendingDiscussionSummary(pendingQuery) : false
    const queryForDify = treatAsReportConfirm && !isDiscussionSummaryConfirm ? effectivePending! : (treatAsReportConfirm ? '' : message)

    if (useEchoReply) {
      const safeContent =
        useReportEcho &&
        reportTargetContent &&
        !isEchoReplyContent(reportTargetContent) &&
        !isReportCreatedContent(reportTargetContent)
          ? reportTargetContent
          : null
      const pendingValue = useDiscussionSummaryEcho
        ? PENDING_DISCUSSION_SUMMARY_PREFIX + message
        : useReportEcho && reportTargetRef && !safeContent
          ? wrapPendingUserTopic(reportTargetRef, message)
          : (useReportEcho && safeContent ? safeContent : message)
      await supabase
        .from('consulting_sessions')
        .update({ pending_report_query: pendingValue, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
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
    } else if (useEchoReply) {
      // レポート依頼の復唱: ユーザーが指定した〇〇（reportTargetRef）を表題に使う。無い場合は該当AI回答の見出し
      aiResponseContent = useDiscussionSummaryEcho
        ? buildDiscussionSummaryEchoReply(message)
        : buildEchoReply(message, reportTargetContent, reportTargetRef ?? undefined)
      processingTime = Date.now() - difyStartTime
      console.log('📝 Report request echo - skipping Dify', useDiscussionSummaryEcho ? '(discussion summary)' : '')
    } else {
      // 通常のDify呼び出し または 議論まとめ時の要約用呼び出し
      // 通常レポート確認時: effectivePending（pending または復旧した対象）をレポート形式で整えるよう依頼する
      let messageToSend = queryForDify
      // 該当AI回答が見つからず「ユーザー指定トピック」で保留している場合: 会話履歴から該当部分を抽出してレポート化
      if (treatAsReportConfirm && effectivePending && isPendingUserTopic(effectivePending)) {
        const unwrapped = unwrapPendingUserTopic(effectivePending)
        if (unwrapped) {
          const collected = await getAllSessionMessages(supabase, sessionId, 50)
          if (collected.length > 0) {
            const conversationText = formatCollectedConversation(collected)
            messageToSend = `以下は相談のやり取りです。ユーザーは【${unwrapped.topic}】についてのレポートを求めています。会話からその話題に関する部分を抽出し、レポート形式（見出し・箇条書き・必要なら表）でまとめてください。\n\n---\n\n${conversationText}`
          }
        }
      } else if (treatAsReportConfirm && !isDiscussionSummaryConfirm && effectivePending) {
        messageToSend = `以下をレポート形式（見出し・箇条書き・必要なら表）で整えてください。\n\n---\n\n${effectivePending}`
      }

      if (isDiscussionSummaryConfirm && pendingQuery) {
        const originalMessage = unwrapPendingDiscussionSummaryQuery(pendingQuery)
        const theme = extractDiscussionSummaryTheme(originalMessage)
        let collected: Awaited<ReturnType<typeof collectMessagesByTheme>>
        if (theme) {
          collected = await collectMessagesByTheme(supabase, sessionId, theme, { maxMessages: 50 })
        } else {
          collected = await getAllSessionMessages(supabase, sessionId, 50)
        }
        if (collected.length === 0) {
          aiResponseContent = '該当する議論が見つかりませんでした。テーマに合う発言が会話に含まれているかご確認ください。'
          processingTime = Date.now() - difyStartTime
        } else {
          const conversationText = formatCollectedConversation(collected)
          const themeLabel = theme || 'ご指定のテーマ'
          messageToSend = `以下は、ある相談セッションの会話です。【${themeLabel}】に関する部分を整理・要約し、レポート形式（見出し・箇条書き・必要なら表）で出力してください。\n\n---\n\n${conversationText}`
        }
      }

      if (messageToSend) {
        try {
          // レポート確認時は会話履歴を渡さず、依頼文だけをDifyに送りレポートを生成させる
          const bodyPayload: Record<string, unknown> = {
            sessionId,
            message: messageToSend,
            userId: user.id,
            categoryInfo,
          };
          if (!treatAsReportConfirm && conversationId) {
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

      if (pendingQuery && treatAsReportConfirm) {
        await supabase
          .from('consulting_sessions')
          .update({ pending_report_query: null, updated_at: new Date().toISOString() })
          .eq('id', sessionId)
      }
    }

    // 3. AIレスポンス保存
    // レポート確認後は「〇〇のレポートを作成しました。」＋本文の2件を保存する
    const aiMessageOrder = isInitialMessageDuplicate ? 2 : nextMessageOrder + 1
    const isReportConfirmResponse = !!(
      treatAsReportConfirm &&
      effectivePending &&
      aiResponseContent &&
      !useEchoReply
    )

    let aiMessage: { id: string; content: string; role: string; created_at: string; message_order: number; analysis_type?: string | null; tokens_used?: number; processing_time_ms?: number }
    let aiMessageSecond: typeof aiMessage | null = null

    if (isReportConfirmResponse) {
      const createdReply = buildReportCreatedReply(effectivePending!)
      const { data: firstMsg, error: firstError } = await supabase
        .from('consulting_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: createdReply,
          message_order: aiMessageOrder,
          tokens_used: 0,
          processing_time_ms: 0,
        })
        .select()
        .single()
      if (firstError) {
        console.error('AI message (report created) save error:', firstError)
        return NextResponse.json(
          { error: firstError.message },
          { status: 500 }
        )
      }
      const { data: secondMsg, error: secondError } = await supabase
        .from('consulting_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: aiResponseContent,
          message_order: aiMessageOrder + 1,
          tokens_used: tokensUsed,
          processing_time_ms: processingTime,
        })
        .select()
        .single()
      if (secondError) {
        console.error('AI message (report body) save error:', secondError)
        return NextResponse.json(
          { error: secondError.message },
          { status: 500 }
        )
      }
      aiMessage = firstMsg
      aiMessageSecond = secondMsg
    } else {
      const aiMessageData: any = {
        session_id: sessionId,
        role: 'assistant',
        content: aiResponseContent,
        message_order: aiMessageOrder,
        tokens_used: tokensUsed,
        processing_time_ms: processingTime,
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

    // 全件のメッセージを作成（既存 + 新規。レポート確認時は user + 作成しました + 本文の3件）
    const allMessages = [
      ...(existingMessages || []),
      userMessage,
      aiMessage,
      ...(aiMessageSecond ? [aiMessageSecond] : []),
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
