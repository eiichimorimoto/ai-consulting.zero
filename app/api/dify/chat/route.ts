/**
 * Dify Chat API
 * 
 * Difyワークフローにメッセージ送信＋コンテキスト付与
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/dify/chat
 * 
 * Difyにメッセージ送信（コンテキスト準備含む）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message, userId } = body

    // バリデーション
    if (!message || !userId) {
      return NextResponse.json(
        { error: 'message and userId are required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // 1. Dify Context API からコンテキスト取得
    let context: any
    
    try {
      const contextResponse = await fetch(`${request.nextUrl.origin}/api/dify/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.DIFY_API_KEY || ''
        },
        body: JSON.stringify({
          userId,
          isNewCase: !sessionId // セッションIDがない場合は新規案件
        })
      })

      if (!contextResponse.ok) {
        throw new Error('Failed to fetch context')
      }

      const contextData = await contextResponse.json()
      context = contextData.data

    } catch (contextError) {
      console.error('Context fetch error:', contextError)
      // コンテキスト取得失敗時はエラーを返す
      return NextResponse.json(
        { error: 'Failed to prepare consultation context' },
        { status: 500 }
      )
    }

    // 2. Difyワークフロー呼び出し
    // 注: 実際のDifyワークフローURLは環境変数で設定
    const difyWorkflowUrl = process.env.DIFY_WORKFLOW_URL

    if (!difyWorkflowUrl) {
      console.warn('DIFY_WORKFLOW_URL not set, using mock response')
      
      // モックレスポンス（開発・テスト用）
      const mockResponse = generateMockResponse(message, context)
      const processingTime = Date.now() - startTime

      return NextResponse.json({
        response: mockResponse,
        tokens_used: Math.round(mockResponse.length * 0.75), // 概算（整数化）
        processing_time: processingTime,
        is_mock: true
      })
    }

    // 実際のDify API呼び出し
    try {
      const difyResponse = await fetch(difyWorkflowUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            user_message: message,
            context: JSON.stringify(context)
          },
          user: userId,
          response_mode: 'blocking' // または 'streaming'
        })
      })

      if (!difyResponse.ok) {
        throw new Error(`Dify API error: ${difyResponse.status} ${difyResponse.statusText}`)
      }

      const difyData = await difyResponse.json()
      const processingTime = Date.now() - startTime

      // Difyレスポンスの形式に応じて調整
      const aiResponse = difyData.data?.outputs?.response 
        || difyData.answer 
        || difyData.data?.answer
        || 'AI応答の取得に失敗しました。'

      const tokensUsed = difyData.metadata?.usage?.total_tokens 
        || difyData.usage?.total_tokens 
        || 0

      return NextResponse.json({
        response: aiResponse,
        tokens_used: tokensUsed,
        processing_time: processingTime,
        is_mock: false
      })

    } catch (difyError) {
      console.error('Dify API call error:', difyError)
      
      // Difyエラー時はフォールバックレスポンス
      const fallbackResponse = generateFallbackResponse(message, context)
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
  const difyWorkflowUrl = process.env.DIFY_WORKFLOW_URL
  const difyApiKey = process.env.DIFY_API_KEY

  return NextResponse.json({
    status: 'ok',
    endpoint: 'Dify Chat API',
    version: '1.0.0',
    dify_workflow_configured: !!difyWorkflowUrl,
    dify_api_key_configured: !!difyApiKey,
    mode: difyWorkflowUrl ? 'production' : 'mock'
  })
}
