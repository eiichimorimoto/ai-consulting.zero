/**
 * Dify Context API
 * 
 * Difyワークフローから呼び出されるAPIエンドポイント
 * 新規案件・継続案件に応じて必要なコンテキストを返す
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// レスポンス型定義
interface DifyContextResponse {
  success: boolean
  data?: {
    profile: ProfileContext
    company: CompanyContext
    webResources: WebResourceContext[]
    businessCards: BusinessCardContext[]
    conversationHistory?: ConversationHistoryContext | null
  }
  error?: string
}

interface ProfileContext {
  name: string
  position: string | null
  department: string | null
  email: string
  phone: string | null
}

interface CompanyContext {
  name: string
  industry: string | null
  employee_count: string | null
  annual_revenue: string | null
  business_description: string | null
  current_challenges: string[] | null
  growth_stage: string | null
  it_maturity_level: string | null
}

interface WebResourceContext {
  title: string | null
  description: string | null
  url: string
  relevance_score: number | null
}

interface BusinessCardContext {
  person_name: string
  company_name: string | null
  position: string | null
  email: string | null
  phone: string | null
}

interface ConversationHistoryContext {
  session: {
    id: string
    title: string
    summary: string | null
    insights: any
    recommendations: any
  }
  recentMessages: Array<{
    role: string
    content: string
    timestamp: string
  }>
  reports: Array<{
    id: string
    title: string
    report_type: string
    executive_summary: string | null
    score: number | null
    created_at: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディ取得
    const body = await request.json()
    const { userId, isNewCase = true } = body

    // バリデーション
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // APIキー認証
    const apiKey = request.headers.get('x-api-key')
    const expectedApiKey = process.env.DIFY_API_KEY

    if (!expectedApiKey) {
      console.error('DIFY_API_KEY is not set in environment variables')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // 1. 基本情報取得（新規・継続共通）
    const baseContext = await getBaseContext(supabase, userId)

    if (!baseContext) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // 2. 継続案件の場合は会話履歴も取得
    const conversationHistory = isNewCase 
      ? null 
      : await getConversationHistory(supabase, userId)

    const response: DifyContextResponse = {
      success: true,
      data: {
        ...baseContext,
        conversationHistory
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Dify context API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}

/**
 * 基本情報取得（新規・継続案件共通）
 */
async function getBaseContext(supabase: any, userId: string) {
  try {
    // プロフィール取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        name,
        position,
        department,
        email,
        phone,
        company_id,
        companies:company_id (
          name,
          industry,
          employee_count,
          annual_revenue,
          business_description,
          current_challenges,
          growth_stage,
          it_maturity_level
        )
      `)
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return null
    }

    // Web情報取得
    let webResources: WebResourceContext[] = []
    if (profile.company_id) {
      const { data: webData } = await supabase
        .from('company_web_resources')
        .select('title, description, url, relevance_score')
        .eq('company_id', profile.company_id)
        .order('relevance_score', { ascending: false })
        .limit(5)

      webResources = webData || []
    }

    // 名刺情報取得
    const { data: cardsData } = await supabase
      .from('business_cards')
      .select('person_name, company_name, position, email, phone')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    const businessCards: BusinessCardContext[] = cardsData || []

    return {
      profile: {
        name: profile.name,
        position: profile.position,
        department: profile.department,
        email: profile.email,
        phone: profile.phone
      },
      company: profile.companies || {
        name: '',
        industry: null,
        employee_count: null,
        annual_revenue: null,
        business_description: null,
        current_challenges: null,
        growth_stage: null,
        it_maturity_level: null
      },
      webResources,
      businessCards
    }
  } catch (error) {
    console.error('Error in getBaseContext:', error)
    throw error
  }
}

/**
 * 会話履歴取得（継続案件のみ）
 */
async function getConversationHistory(
  supabase: any, 
  userId: string
): Promise<ConversationHistoryContext | null> {
  try {
    // 最新のアクティブセッション取得
    const { data: sessions } = await supabase
      .from('consulting_sessions')
      .select(`
        id,
        title,
        analysis_summary,
        key_insights,
        recommendations,
        consulting_messages!session_id (
          role,
          content,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (!sessions || sessions.length === 0) {
      return null
    }

    const session = sessions[0]

    // 直近のメッセージのみ取得（最大10件）
    const recentMessages = (session.consulting_messages || [])
      .slice(-10)
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      }))

    // 過去のレポート取得
    const { data: reports } = await supabase
      .from('reports')
      .select('id, title, report_type, executive_summary, score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)

    return {
      session: {
        id: session.id,
        title: session.title,
        summary: session.analysis_summary,
        insights: session.key_insights,
        recommendations: session.recommendations
      },
      recentMessages,
      reports: reports || []
    }
  } catch (error) {
    console.error('Error in getConversationHistory:', error)
    return null
  }
}

/**
 * GET method for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Dify Context API',
    version: '1.0.0'
  })
}
