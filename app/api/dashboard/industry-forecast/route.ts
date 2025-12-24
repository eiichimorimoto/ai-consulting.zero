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
      .select('industry, business_description, retrieved_info')
      .eq('id', profile.company_id)
      .single()

    if (!company) {
      return NextResponse.json(
        { error: "会社情報が見つかりません" },
        { status: 404 }
      )
    }

    // 業種を明確に含めて外部情報を検索
    const industryQuery = company.industry || '製造業'
    
    // 業界予測に必要な情報を検索
    const queries = [
      `${industryQuery} 受注動向 予測 2025`,
      `${industryQuery} 原材料価格 予測 2025`,
      `${industryQuery} 設備投資 動向 2025`,
      `${industryQuery} 業界 予測 見通し`,
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
    
    // これまで検索した内容を取得（実際にはキャッシュや履歴から取得）
    // ここでは会社情報と取得情報を使用
    const searchContext = `
業種: ${industryQuery}
事業内容: ${company.business_description || '不明'}
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
          content: `以下の${industryQuery}業界の会社情報と外部検索結果を基に、6ヶ月先の業界予測を行ってください。

${searchContext}

【予測項目】
1. 受注動向: ${industryQuery}業界の受注トレンド
2. 原材料価格: ${industryQuery}業界で使用する原材料の価格動向
3. 設備投資: ${industryQuery}業界の設備投資動向

各項目について、${industryQuery}業界に特化した内容で、トレンド（up/neutral/down）、予測値、説明を提供してください。`,
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

