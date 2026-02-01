/**
 * Dify Chat API
 * 
 * Dify Chatflowにメッセージ送信（会話履歴自動管理）
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/dify/chat
 * 
 * Difyにメッセージ送信（Chatflow API）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message, userId, conversationId } = body

    // バリデーション
    if (!message || !userId) {
      return NextResponse.json(
        { error: 'message and userId are required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Dify Chatflow 呼び出し
    const difyChatflowUrl = process.env.DIFY_CHATFLOW_URL
    const difyApiKey = process.env.DIFY_CHATFLOW_API_KEY

    if (!difyChatflowUrl || !difyApiKey) {
      console.warn('DIFY_CHATFLOW_URL or DIFY_CHATFLOW_API_KEY not set, using mock response')
      
      // モックレスポンス（開発・テスト用）
      const mockResponse = generateMockResponse(message, { profile: { name: 'お客様' }, company: { name: 'お客様の会社' } })
      const processingTime = Date.now() - startTime

      return NextResponse.json({
        response: mockResponse,
        tokens_used: Math.round(mockResponse.length * 0.75), // 概算（整数化）
        processing_time: processingTime,
        is_mock: true
      })
    }

    // 実際のDify Chatflow API呼び出し
    try {
      console.log('📥 /api/dify/chat - Received conversationId:', conversationId || 'null')
      
      const requestBody: any = {
        inputs: {},  // Chatflow APIでは inputs が必須
        query: message,
        user: userId,
        response_mode: 'blocking'
      }

      // 会話履歴管理: conversation_idがあれば送信
      if (conversationId) {
        requestBody.conversation_id = conversationId
        console.log('✅ Adding conversation_id to Dify request:', conversationId)
      } else {
        console.log('🆕 No conversation_id - starting new Dify conversation')
      }

      console.log('📤 Dify Chatflow Request:', {
        url: difyChatflowUrl,
        has_conversation_id: !!requestBody.conversation_id
      })

      const difyResponse = await fetch(difyChatflowUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!difyResponse.ok) {
        const errorText = await difyResponse.text()
        console.error('Dify Chatflow API Error:', {
          status: difyResponse.status,
          statusText: difyResponse.statusText,
          body: errorText,
          requestUrl: difyChatflowUrl
        })
        throw new Error(`Dify API error: ${difyResponse.status} ${difyResponse.statusText} - ${errorText}`)
      }

      const difyData = await difyResponse.json()
      const processingTime = Date.now() - startTime

      // Chatflow APIのレスポンス形式
      const aiResponse = difyData.answer || difyData.data?.answer || JSON.stringify(difyData)
      const newConversationId = difyData.conversation_id
      const tokensUsed = difyData.metadata?.usage?.total_tokens || 0

      // デバッグ: 重要なレスポンス情報をログ出力
      console.log('📥 Dify Chatflow Response:', {
        has_answer: !!difyData.answer,
        has_conversation_id: !!newConversationId,
        conversation_id: newConversationId || 'null',
        tokens: tokensUsed,
        time: processingTime + 'ms'
      })

      return NextResponse.json({
        response: aiResponse,
        conversation_id: newConversationId,  // 会話履歴管理用
        tokens_used: tokensUsed,
        processing_time: processingTime,
        is_mock: false
      })

    } catch (difyError) {
      console.error('Dify API call error:', difyError)
      
      // Difyエラー時はフォールバックレスポンス
      const fallbackResponse = generateFallbackResponse(message, { profile: { name: 'お客様' } })
      const processingTime = Date.now() - startTime

      return NextResponse.json({
        response: fallbackResponse,
        tokens_used: 0,
        processing_time: processingTime,
        is_mock: true,
        error: 'Dify API temporarily unavailable'
      })
    }

  } catch (error) {
    console.error('POST /api/dify/chat error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}

/**
 * モックレスポンス生成（開発・テスト用）
 */
function generateMockResponse(message: string, context: any): string {
  const companyName = context?.company?.name || 'お客様の会社'
  const userName = context?.profile?.name || 'お客様'
  
  return `${userName}様、ご相談ありがとうございます。

${companyName}の状況を確認いたしました。

【現状の理解】
お問い合わせの内容は「${message.slice(0, 100)}${message.length > 100 ? '...' : ''}」ですね。

【分析結果】
貴社の業界動向や現在の課題を踏まえ、以下の点について検討する必要があると考えます：

1. 現状の業務プロセスの可視化
2. デジタル化による効率改善の余地
3. 短期的な改善施策と中長期的な戦略

【具体的な提案】
次のステップとして、以下をご提案いたします：

1. 現状のヒアリング詳細化
2. 優先課題の特定
3. 実行可能な施策の立案

何か追加でお聞きしたいことはございますか？

※ これはモックレスポンスです。実際のDify連携には環境変数DIFY_WORKFLOW_URLの設定が必要です。`
}

/**
 * フォールバックレスポンス生成（Difyエラー時）
 */
function generateFallbackResponse(message: string, context: any): string {
  const userName = context?.profile?.name || 'お客様'
  
  return `${userName}様、申し訳ございません。

現在、AI処理システムに一時的な問題が発生しております。

お問い合わせの内容は確実に記録されておりますので、
しばらく経ってから再度お試しいただくか、
別の質問をお寄せいただければ幸いです。

ご不便をおかけして申し訳ございません。`
}

/**
 * GET method for health check
 */
export async function GET() {
  const difyChatflowUrl = process.env.DIFY_CHATFLOW_URL
  const difyApiKey = process.env.DIFY_CHATFLOW_API_KEY

  return NextResponse.json({
    status: 'ok',
    endpoint: 'Dify Chatflow API',
    version: '2.0.0',
    dify_chatflow_configured: !!difyChatflowUrl,
    dify_api_key_configured: !!difyApiKey,
    mode: difyChatflowUrl && difyApiKey ? 'chatflow' : 'mock',
    conversation_history: 'automatic'
  })
}
