/**
 * Dify Chat API
 * 
 * Dify Chatflowにメッセージ送信（会話履歴自動管理 + 会社情報連携）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/dify/chat
 * 
 * Difyにメッセージ送信（Chatflow API）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message, userId, conversationId, categoryInfo } = body

    console.log('📥 Dify API received:', {
      sessionId,
      userId,
      conversationId,
      categoryInfo
    })

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

    // 会社情報とプロフィールを取得
    // RLSバイパスのため、SERVICE_ROLE_KEYを使用
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('🔧 Environment check:', {
      has_supabase_url: !!supabaseUrl,
      supabase_url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
      has_service_key: !!supabaseServiceKey,
      service_key_length: supabaseServiceKey?.length || 0
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase環境変数が設定されていません')
      throw new Error('Supabase環境変数が設定されていません')
    }
    
    let companyInfo: any = {}
    let profileInfo: any = {}

    try {
      console.log('🔑 Using SERVICE_ROLE_KEY to bypass RLS')
      
      // @supabase/supabase-js を動的インポート
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      console.log('✅ @supabase/supabase-js imported successfully')
      
      const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      console.log('✅ supabaseAdmin client created')
      
      // プロフィールと会社情報をJOINで取得（RLSバイパス）
      console.log('📡 Executing profiles query for userId:', userId)
      const { data: profiles, error: profileError, count } = await supabaseAdmin
        .from('profiles')
        .select(`
          *,
          companies (
            id,
            name,
            industry,
            capital,
            employee_count,
            fiscal_year_end,
            website,
            business_description
          )
        `, { count: 'exact' })
        .eq('user_id', userId)

      console.log('🔍 Profile query result:', {
        userId,
        count,
        has_error: !!profileError,
        error_message: profileError?.message,
        error_details: profileError?.details,
        error_hint: profileError?.hint,
        error_code: profileError?.code,
        profiles_length: profiles?.length || 0,
        profiles_data_full: profiles ? JSON.stringify(profiles, null, 2) : 'null',
        first_profile_exists: !!profiles?.[0],
        first_profile_has_company: profiles?.[0]?.companies ? true : false,
        first_profile_company_id: profiles?.[0]?.company_id || 'null'
      })

      const profile = profiles?.[0] // 最初の1件を使用

      if (!profileError && profile) {
        console.log('📋 Profile data:', {
          profile_id: profile.id,
          user_id: profile.user_id,
          company_id: profile.company_id,
          name: profile.name,
          has_companies_data: !!profile.companies
        })

        profileInfo = {
          name: profile.name,
          email: profile.email,
          position: profile.position,
          department: profile.department
        }

        if (profile.companies) {
          console.log('🏢 Company data:', profile.companies)
          
          companyInfo = {
            name: profile.companies.name,
            industry: profile.companies.industry,
            capital: profile.companies.capital,
            employee_count: profile.companies.employee_count,
            fiscal_year_end: profile.companies.fiscal_year_end,
            website: profile.companies.website,
            business_description: profile.companies.business_description
          }
          
          console.log('✅ Company info extracted:', companyInfo)
        } else {
          console.warn('⚠️ Profile found but no companies data')
        }

        console.log('✅ Company & Profile info fetched:', {
          company: companyInfo.name || 'なし',
          user: profileInfo.name,
          has_company_info: !!companyInfo.name
        })
      } else {
        console.warn('⚠️ Profile not found or error:', {
          error: profileError?.message,
          has_profile: !!profile
        })
      }
    } catch (fetchError) {
      console.error('❌ Failed to fetch company info:', {
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      })
      // エラーが発生してもDify呼び出しは続行
    }

    // 実際のDify Chatflow API呼び出し
    try {
      console.log('📥 /api/dify/chat - Received conversationId:', conversationId || 'null')
      
      const requestBody: any = {
        inputs: {
          // 会社情報をDifyに渡す
          company_name: companyInfo.name || '',
          industry: companyInfo.industry || '',
          capital: companyInfo.capital || '',
          employee_count: companyInfo.employee_count || '',
          website: companyInfo.website || '',
          business_description: companyInfo.business_description || '',
          
          // ユーザー情報
          user_name: profileInfo.name || '',
          user_position: profileInfo.position || '',
          user_department: profileInfo.department || '',

          // カテゴリ情報（課題の文脈）
          selected_category: categoryInfo?.selectedCategory || '',
          selected_subcategory: categoryInfo?.selectedSubcategory || ''
        },
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

      // 📤 Dify Request Body の完全な内容をログ出力
      console.log('📤 Dify Request Body (FULL):', JSON.stringify(requestBody, null, 2))

      console.log('📤 Dify Chatflow Request:', {
        url: difyChatflowUrl,
        has_conversation_id: !!requestBody.conversation_id,
        has_company_info: !!companyInfo.name,
        company: companyInfo.name || 'なし'
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

      // 📥 Dify Response の完全な内容をログ出力
      console.log('📥 Dify Response (FULL):', JSON.stringify(difyData, null, 2))

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
