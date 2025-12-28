import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createAnthropic } from "@ai-sdk/anthropic"
import { generateObject } from "ai"
import { z } from "zod"

export const runtime = "nodejs"

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 20_000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

const braveWebSearch = async (query: string, count = 5): Promise<any[]> => {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (!key) return []
  const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`
  const resp = await fetchWithTimeout(
    endpoint,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": key,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    },
    12_000
  )
  if (!resp.ok) return []
  const json: any = await resp.json()
  return json?.web?.results || []
}

const forecastSchema = z.object({
  orderTrend: z.object({
    trend: z.enum(['up', 'neutral', 'down']).describe("受注動向のトレンド"),
    value: z.string().describe("予測値（例: +12%, 横ばい）"),
    description: z.string().describe("説明"),
  }).describe("受注動向"),
  materialPrice: z.object({
    trend: z.enum(['up', 'neutral', 'down']).describe("原材料価格のトレンド"),
    value: z.string().describe("予測値"),
    description: z.string().describe("説明"),
  }).describe("原材料価格"),
  equipmentInvestment: z.object({
    trend: z.enum(['up', 'neutral', 'down']).describe("設備投資のトレンド"),
    value: z.string().describe("予測値"),
    description: z.string().describe("説明"),
  }).describe("設備投資"),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 }
      )
    }

    // プロファイルと会社情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: "会社情報が見つかりません" },
        { status: 404 }
      )
    }

    const { data: company } = await supabase
      .from('companies')
      .select('name, industry, business_description, retrieved_info')
      .eq('id', profile.company_id)
      .single()

    if (!company) {
      return NextResponse.json(
        { error: "会社情報が見つかりません" },
        { status: 404 }
      )
    }

    // 会社情報を活用して外部情報を検索
    const industryQuery = company.industry || ''
    const businessDesc = company.business_description || ''
    const companyName = company.name || ''
    
    // 会社情報から検索キーワードを構築
    const searchContext = [industryQuery, businessDesc].filter(Boolean).join(' ') || companyName
    
    // 業界予測に必要な情報を検索
    const queries = [
      searchContext ? `${searchContext} 受注動向 予測 2025` : `${companyName} 業界 受注動向`,
      searchContext ? `${searchContext} 原材料価格 予測 2025` : `${companyName} 業界 原材料`,
      searchContext ? `${searchContext} 設備投資 動向 2025` : `${companyName} 業界 設備投資`,
      industryQuery ? `${industryQuery} 業界 予測 見通し 2025` : `${companyName} 業界 予測`,
    ]
    
    const searchResults: any[] = []
    for (const q of queries) {
      const results = await braveWebSearch(q, 3)
      searchResults.push(...results)
    }
    
    const searchText = searchResults
      .slice(0, 10)
      .map((r: any) => `${r.title || ''}\n${r.description || ''}`)
      .join('\n\n')
    
    // 会社情報と外部検索結果をコンテキストとして構築
    const industryLabel = industryQuery || businessDesc || `${companyName}の業界`
    const companyInfoContext = `
会社名: ${companyName}
業種: ${industryQuery || '不明'}
事業内容: ${businessDesc || '不明'}
取得情報: ${company.retrieved_info ? JSON.stringify(company.retrieved_info) : 'なし'}
外部検索結果:
${searchText}
`.trim()

    // AIで業界予測を実行
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEYが設定されていません" },
        { status: 500 }
      )
    }

    const anthropic = createAnthropic({ apiKey })

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5-20250929"),
      schema: forecastSchema,
      messages: [
        {
          role: "user",
          content: `以下の会社「${companyName}」（${industryLabel}）の情報と外部検索結果を基に、6ヶ月先の業界予測を行ってください。

${companyInfoContext}

【予測項目】
1. 受注動向: ${companyName}が属する業界の受注トレンド
2. 原材料価格: ${companyName}の事業で使用する原材料の価格動向
3. 設備投資: ${companyName}が属する業界の設備投資動向

各項目について、${companyName}の事業に特化した内容で、トレンド（up/neutral/down）、予測値、説明を提供してください。`,
        },
      ],
    })

    return NextResponse.json({
      data: object,
      updatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Industry forecast error:', error)
    return NextResponse.json(
      {
        error: "業界予測の取得に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

