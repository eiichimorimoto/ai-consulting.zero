/**
 * Dify Context API
 * 
 * Difyワークフローから呼び出されるAPIエンドポイント
 * 新規案件・継続案件に応じて必要なコンテキストを返す
 */

import { createClient as createSupabaseClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Supabase Client 型（Service Role Key用）
// NOTE: anyを使用してRLS関連の型エラーを回避
type SupabaseClient = SupabaseClientType<any>

// レスポンス型定義
interface DifyContextResponse {
  success: boolean
  data?: {
    profile: ProfileContext
    company: CompanyContext
    webResources: WebResourceContext[]
    businessCards: BusinessCardContext[]
    conversationHistory?: ConversationHistoryContext | null
    externalInformation?: ExternalInformation | null
    initialEvaluation?: InitialEvaluationData | null
    initialIssue?: InitialIssue | null
    attachments?: AttachmentContext[] | null
  }
  error?: string
}

interface ProfileContext {
  name: string
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

interface ExternalInformation {
  marketData?: {
    currentRate: number | null
    commodities: Array<{
      name: string
      currentPrice: number
      unit: string
      trend: 'up' | 'down' | 'stable'
    }>
    industry: string | null
  }
  localInfo?: {
    laborCosts: {
      current: number | null
      monthly: number | null
      yearly: number | null
      comparison: {
        industryMonthly: number | null
        industryYearly: number | null
      }
    }
    events: Array<{
      title: string
      url: string
      description: string
      date: string
    }>
    infrastructure: Array<{
      title: string
      url: string
      description: string
      status: string
    }>
    weather: {
      location: string
      current: {
        temp: number | null
        desc: string
      }
      week: Array<{
        day: string
        temp: number
      }>
    }
  }
}

interface InitialEvaluationData {
  digitalScore?: {
    overall_score: number | null
    mobile_score: number | null
    desktop_score: number | null
    seo_score: number | null
    accessibility_score: number | null
    created_at: string
  }
  swotAnalysis?: unknown | null
  diagnosticReports?: Array<{
    id: string
    report_title: string
    report_summary: string
    priority_score: number | null
    urgency_score: number | null
    impact_score: number | null
    overall_score: number | null
    created_at: string
  }>
  websiteAnalysis?: {
    overallScore: number | null
    topIssues: Array<{
      category: string
      severity: string
      issue: string
      impact: string
    }>
    metrics: {
      mobileScore: number | null
      desktopScore: number | null
      seoScore: number | null
      accessibilityScore: number | null
    }
  } | null
}

interface InitialIssue {
  content: string
  category: string
  categoryLabel: string
  createdAt: string
}

interface AttachmentContext {
  id: string
  name: string
  type: string
  size: number
  content: string
  preview: string
  wordCount: number
  lineCount: number
  url?: string
}

interface ConversationHistoryContext {
  session: {
    id: string
    title: string
    summary: string | null
    insights: unknown
    recommendations: unknown
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
    const { userId, sessionId, isNewCase = true, initialIssue: initialIssueRaw } = body

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

    // Service Role Key を使用してSupabaseクライアント作成
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase環境変数が設定されていません')
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

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

    // 3. 外部情報・初回評価情報・添付ファイルを並列取得
    const [externalInformation, initialEvaluation, attachments] = await Promise.all([
      getExternalInformation(supabase, userId),
      getInitialEvaluationData(supabase, userId),
      sessionId ? getAttachments(supabase, sessionId) : Promise.resolve(null),
    ])

    // 4. 新規課題内容を明示的に含める
    const initialIssue: InitialIssue | null = initialIssueRaw && typeof initialIssueRaw === 'object'
      ? {
          content: String(initialIssueRaw.content ?? ''),
          category: String(initialIssueRaw.category ?? ''),
          categoryLabel: String(initialIssueRaw.categoryLabel ?? ''),
          createdAt: String(
            initialIssueRaw.createdAt ?? new Date().toISOString()
          ),
        }
      : null

    const response: DifyContextResponse = {
      success: true,
      data: {
        ...baseContext,
        conversationHistory,
        externalInformation: externalInformation ?? null,
        initialEvaluation: initialEvaluation ?? null,
        initialIssue,
        attachments: attachments ?? null
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
async function getBaseContext(supabase: SupabaseClient, userId: string) {
  try {
    // プロフィール取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        name,
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

    // Supabaseのリレーション結果は配列として返される場合がある
    const companiesData = profile.companies
    const company: CompanyContext = (Array.isArray(companiesData) ? companiesData[0] : companiesData) || {
      name: '',
      industry: null,
      employee_count: null,
      annual_revenue: null,
      business_description: null,
      current_challenges: null,
      growth_stage: null,
      it_maturity_level: null
    }

    return {
      profile: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone
      },
      company,
      webResources,
      businessCards
    }
  } catch (error) {
    console.error('Error in getBaseContext:', error)
    throw error
  }
}

/**
 * 外部情報（マーケット・地域情報）の取得
 */
async function getExternalInformation(
  supabase: SupabaseClient,
  userId: string
): Promise<ExternalInformation | null> {
  try {
    // 会社ID取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single()

    const companyId = profile?.company_id
    if (!companyId) {
      return null
    }

    // マーケットデータ（dashboard_data: market）
    const { data: marketRow } = await supabase
      .from('dashboard_data')
      .select('data')
      .eq('company_id', companyId)
      .eq('data_type', 'market')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const marketDataRaw = marketRow?.data as Record<string, unknown> | undefined

    // 地域情報（dashboard_data: local_info）
    const { data: localInfoRow } = await supabase
      .from('dashboard_data')
      .select('data')
      .eq('company_id', companyId)
      .eq('data_type', 'local_info')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const localInfoRaw = localInfoRow?.data as Record<string, unknown> | undefined

    if (!marketDataRaw && !localInfoRaw) {
      return null
    }

    const externalInfo: ExternalInformation = {}

    if (marketDataRaw) {
      const commoditiesRaw = Array.isArray(marketDataRaw.commodities)
        ? marketDataRaw.commodities
        : []

      externalInfo.marketData = {
        currentRate:
          typeof marketDataRaw.currentRate === 'number'
            ? marketDataRaw.currentRate
            : null,
        commodities: commoditiesRaw
          .map((c: unknown) => {
            if (!c || typeof c !== 'object') return null
            const commodity = c as Record<string, unknown>
            const priceSource =
              typeof commodity.priceJpy === 'number'
                ? commodity.priceJpy
                : typeof commodity.price === 'number'
                  ? commodity.price
                  : null
            if (priceSource === null) return null

            let trend: 'up' | 'down' | 'stable' = 'stable'
            const change = typeof commodity.change === 'number' ? commodity.change : 0
            if (change > 0) trend = 'up'
            else if (change < 0) trend = 'down'

            return {
              name: String(commodity.name ?? ''),
              currentPrice: priceSource,
              unit: String(commodity.unit ?? ''),
              trend,
            }
          })
          .filter((c): c is NonNullable<typeof c> => c !== null),
        industry:
          typeof marketDataRaw.industry === 'string'
            ? marketDataRaw.industry
            : null,
      }
    }

    if (localInfoRaw) {
      const labor = (localInfoRaw.laborCosts ?? {}) as Record<string, unknown>
      const laborComparison = (labor.comparison ?? {}) as Record<string, unknown>

      const weather = (localInfoRaw.weather ?? {}) as Record<string, unknown>
      const weatherCurrent = (weather.current ?? {}) as Record<string, unknown>
      const weekArray = Array.isArray(weather.week) ? (weather.week as unknown[]) : []

      externalInfo.localInfo = {
        laborCosts: {
          current:
            typeof labor.current === 'number' ? labor.current : null,
          monthly:
            typeof labor.monthly === 'number' ? labor.monthly : null,
          yearly:
            typeof labor.yearly === 'number' ? labor.yearly : null,
          comparison: {
            industryMonthly:
              typeof laborComparison.industryMonthly === 'number'
                ? laborComparison.industryMonthly
                : null,
            industryYearly:
              typeof laborComparison.industryYearly === 'number'
                ? laborComparison.industryYearly
                : null,
          },
        },
        events: Array.isArray(localInfoRaw.events)
          ? (localInfoRaw.events as unknown[]).map((e) => {
              const event = e as Record<string, unknown>
              return {
                title: String(event.title ?? ''),
                url: String(event.url ?? ''),
                description: String(event.description ?? ''),
                date: String(event.date ?? ''),
              }
            })
          : [],
        infrastructure: Array.isArray(localInfoRaw.infrastructure)
          ? (localInfoRaw.infrastructure as unknown[]).map((i) => {
              const infra = i as Record<string, unknown>
              return {
                title: String(infra.title ?? ''),
                url: String(infra.url ?? ''),
                description: String(infra.description ?? ''),
                status: String(infra.status ?? ''),
              }
            })
          : [],
        weather: {
          location: String(weather.location ?? ''),
          current: {
            temp:
              typeof weatherCurrent.temp === 'number'
                ? weatherCurrent.temp
                : null,
            desc: String(weatherCurrent.desc ?? ''),
          },
          week: weekArray.map((w) => {
            const day = w as Record<string, unknown>
            return {
              day: String(day.day ?? ''),
              temp:
                typeof day.temp === 'number'
                  ? day.temp
                  : Number.isFinite(Number(day.temp))
                    ? Number(day.temp)
                    : 0,
            }
          }),
        },
      }
    }

    return externalInfo
  } catch (error) {
    console.error('Error in getExternalInformation:', error)
    return null
  }
}

/**
 * 会話履歴取得（継続案件のみ）
 */
async function getConversationHistory(
  supabase: SupabaseClient,
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
      .map((msg: unknown) => {
        const message = msg as Record<string, unknown>
        return {
          role: String(message.role ?? ''),
          content: String(message.content ?? ''),
          timestamp: String(message.created_at ?? '')
        }
      })

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
 * 初回評価情報の取得
 */
async function getInitialEvaluationData(
  supabase: SupabaseClient,
  userId: string
): Promise<InitialEvaluationData | null> {
  try {
    // 会社ID取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single()

    const companyId = profile?.company_id
    if (!companyId) {
      return null
    }

    // デジタルスコア（最新1件）
    const { data: digitalScoreRow } = await supabase
      .from('digital_scores')
      .select(
        'performance_score, accessibility_score, best_practices_score, seo_score, collected_at'
      )
      .eq('company_id', companyId)
      .order('collected_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 診断レポート（最新3件）
    const { data: diagnosticReportsRows } = await supabase
      .from('diagnostic_reports')
      .select('id, report_data, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(3)

    // SWOT分析（dashboard_data のキャッシュがあれば利用）
    const { data: swotRow } = await supabase
      .from('dashboard_data')
      .select('data')
      .eq('company_id', companyId)
      .eq('data_type', 'swot_analysis')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const result: InitialEvaluationData = {}

    if (digitalScoreRow) {
      result.digitalScore = {
        overall_score:
          typeof digitalScoreRow.performance_score === 'number'
            ? digitalScoreRow.performance_score
            : null,
        mobile_score: null,
        desktop_score: null,
        seo_score:
          typeof digitalScoreRow.seo_score === 'number'
            ? digitalScoreRow.seo_score
            : null,
        accessibility_score:
          typeof digitalScoreRow.accessibility_score === 'number'
            ? digitalScoreRow.accessibility_score
            : null,
        created_at: String(digitalScoreRow.collected_at),
      }
    }

    if (Array.isArray(diagnosticReportsRows) && diagnosticReportsRows.length) {
      result.diagnosticReports = diagnosticReportsRows.map((row: unknown) => {
        const rowData = row as Record<string, unknown>
        const data = (rowData.report_data || {}) as Record<string, unknown>
        return {
          id: String(rowData.id),
          report_title: String(data.report_title ?? '診断レポート'),
          report_summary: String(data.report_summary ?? ''),
          priority_score:
            typeof data.priority_score === 'number'
              ? data.priority_score
              : null,
          urgency_score:
            typeof data.urgency_score === 'number'
              ? data.urgency_score
              : null,
          impact_score:
            typeof data.impact_score === 'number'
              ? data.impact_score
              : null,
          overall_score:
            typeof data.overall_score === 'number'
              ? data.overall_score
              : null,
          created_at: String(rowData.created_at),
        }
      })
    }

    if (swotRow?.data) {
      // swot-analysis API が生成したオブジェクトをそのまま渡す
      result.swotAnalysis = swotRow.data
    } else {
      result.swotAnalysis = null
    }

    // Webサイト分析（diagnosis_previews）は、会社紐付けが明確でないため当面は未使用
    result.websiteAnalysis = null

    if (
      !result.digitalScore &&
      !result.diagnosticReports &&
      !result.swotAnalysis &&
      !result.websiteAnalysis
    ) {
      return null
    }

    return result
  } catch (error) {
    console.error('Error in getInitialEvaluationData:', error)
    return null
  }
}

/**
 * 添付ファイル情報の取得
 * 
 * セッションの全メッセージから添付ファイルを取得し、Difyに渡す形式に整形
 */
async function getAttachments(
  supabase: SupabaseClient,
  sessionId: string
): Promise<AttachmentContext[] | null> {
  try {
    // セッションの全ユーザーメッセージから添付ファイル取得
    const { data: messages, error } = await supabase
      .from('consulting_messages')
      .select('attachments, created_at')
      .eq('session_id', sessionId)
      .eq('role', 'user')
      .not('attachments', 'is', null)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching attachments:', error)
      return null
    }
    
    if (!messages || messages.length === 0) {
      return null
    }
    
    // 全メッセージから添付ファイルを抽出
    const allAttachments: AttachmentContext[] = []
    const seenIds = new Set<string>()
    
    for (const message of messages) {
      if (!message.attachments || !Array.isArray(message.attachments)) {
        continue
      }
      
      for (const attachment of message.attachments) {
        // 重複チェック（IDまたはURLで判定）
        const uniqueKey = attachment.id || attachment.url || attachment.name
        if (seenIds.has(uniqueKey)) {
          continue
        }
        
        seenIds.add(uniqueKey)
        
        // Dify用に必要な情報のみ抽出
        allAttachments.push({
          id: attachment.id || crypto.randomUUID(),
          name: attachment.name || 'unnamed',
          type: attachment.type || 'application/octet-stream',
          size: attachment.size || 0,
          url: attachment.url || '',
          content: attachment.content || '',
          preview: attachment.preview || '',
          wordCount: attachment.wordCount || 0,
          lineCount: attachment.lineCount || 0,
        })
      }
    }
    
    return allAttachments.length > 0 ? allAttachments : null
  } catch (error) {
    console.error('Error in getAttachments:', error)
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
    version: '1.0.0',
    lastUpdated: '2026-01-26',
    supportedDifyVersions: ['v1.9.0+', 'v1.11.4+', 'v2.0.0-beta.1+'],
    latestVersion: 'v1.11.4',
    nextjsVersion: '16.1.0+'
  })
}
