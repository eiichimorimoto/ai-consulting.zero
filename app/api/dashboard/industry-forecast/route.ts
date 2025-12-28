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
  shortTerm: z.object({
    period: z.string().describe("期間（例: 2025年1-3月）"),
    outlook: z.enum(["positive", "neutral", "negative"]).describe("見通し"),
    keyFactors: z.array(z.object({
      factor: z.string().describe("要因"),
      impact: z.enum(["positive", "negative", "neutral"]).describe("影響"),
      description: z.string().describe("説明"),
    })).describe("主要要因"),
    prediction: z.string().describe("予測サマリー"),
  }).describe("短期予測（3ヶ月）"),
  midTerm: z.object({
    period: z.string().describe("期間（例: 2025年4-9月）"),
    outlook: z.enum(["positive", "neutral", "negative"]).describe("見通し"),
    keyFactors: z.array(z.object({
      factor: z.string().describe("要因"),
      impact: z.enum(["positive", "negative", "neutral"]).describe("影響"),
      description: z.string().describe("説明"),
    })).describe("主要要因"),
    prediction: z.string().describe("予測サマリー"),
  }).describe("中期予測（6ヶ月）"),
  indicators: z.array(z.object({
    name: z.string().describe("指標名"),
    current: z.string().describe("現在値"),
    forecast: z.string().describe("予測値"),
    trend: z.enum(["up", "down", "stable"]).describe("トレンド"),
    confidence: z.enum(["high", "medium", "low"]).describe("信頼度"),
  })).describe("主要指標予測"),
  risks: z.array(z.object({
    risk: z.string().describe("リスク要因"),
    probability: z.enum(["high", "medium", "low"]).describe("発生確率"),
    impact: z.enum(["high", "medium", "low"]).describe("影響度"),
    mitigation: z.string().describe("対策"),
  })).describe("リスク要因"),
  opportunities: z.array(z.object({
    opportunity: z.string().describe("機会"),
    timing: z.string().describe("タイミング"),
    action: z.string().describe("推奨アクション"),
  })).describe("成長機会"),
  recommendation: z.string().describe("経営への提言"),
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
      .select('name, industry, business_description, retrieved_info, prefecture, employee_count, annual_revenue')
      .eq('id', profile.company_id)
      .single()

    if (!company) {
      return NextResponse.json(
        { error: "会社情報が見つかりません" },
        { status: 404 }
      )
    }

    const industryQuery = company.industry || ''
    const businessDesc = company.business_description || ''
    const companyName = company.name || ''
    
    // 多角的な情報を並列収集
    const searchPromises = [
      // 業界予測
      braveWebSearch(`${industryQuery} 業界 予測 見通し 2025 2026`, 5),
      braveWebSearch(`${industryQuery} 市場規模 成長率 予測`, 5),
      // 経済情勢
      braveWebSearch(`日本経済 景気 予測 2025`, 5),
      braveWebSearch(`世界経済 見通し 日本企業 影響`, 5),
      // 為替・金利
      braveWebSearch(`為替 円相場 予測 2025`, 3),
      braveWebSearch(`日銀 金利 政策 企業 影響`, 3),
      // 地政学リスク
      braveWebSearch(`地政学リスク サプライチェーン 2025`, 3),
      // 技術動向
      braveWebSearch(`${industryQuery} 技術 トレンド 予測`, 5),
      // 人材・コスト
      braveWebSearch(`${industryQuery} 人件費 人材 動向`, 3),
      braveWebSearch(`原材料 価格 予測 ${industryQuery}`, 3),
    ]

    const searchResults = await Promise.all(searchPromises)
    
    const formatResults = (results: any[]) => results
      .slice(0, 6)
      .map((r: any) => `[${r.url || ''}] ${r.title || ''}: ${r.description || ''}`)
      .join('\n')

    const searchContext = `
【企業情報】
会社名: ${companyName}
業種: ${industryQuery || '不明'}
所在地: ${company.prefecture || '不明'}
従業員数: ${company.employee_count || '不明'}
売上規模: ${company.annual_revenue || '不明'}
事業内容: ${businessDesc || '不明'}
取得情報: ${company.retrieved_info ? JSON.stringify(company.retrieved_info) : 'なし'}

【業界予測情報】
${formatResults([...searchResults[0], ...searchResults[1]])}

【経済情勢】
${formatResults([...searchResults[2], ...searchResults[3]])}

【為替・金融政策】
${formatResults([...searchResults[4], ...searchResults[5]])}

【地政学リスク】
${formatResults(searchResults[6])}

【技術動向】
${formatResults(searchResults[7])}

【人材・コスト動向】
${formatResults([...searchResults[8], ...searchResults[9]])}
`.trim()

    // AIで包括的な業界予測を実行
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
          content: `以下の企業「${companyName}」（${industryQuery || businessDesc}）の情報と収集した外部情報を基に、包括的な業界予測を行ってください。

${searchContext}

【分析要件】

1. 短期予測（今後3ヶ月）
   - 経済情勢、為替、金融政策を考慮
   - 主要な影響要因3つ
   - 業界への具体的影響

2. 中期予測（今後6ヶ月）
   - 地政学リスク、技術動向を考慮
   - 主要な影響要因3つ
   - 業界への具体的影響

3. 主要指標予測（5つ）
   - 受注・売上動向
   - 原材料価格
   - 人件費・採用
   - 設備投資
   - 輸出・海外需要
   各指標のトレンド（up/down/stable）と信頼度を含める

4. リスク要因（3つ）
   - 発生確率と影響度
   - 具体的な対策

5. 成長機会（3つ）
   - タイミングと推奨アクション

6. 経営への提言
   - 具体的なアドバイス

すべて日本語で、${companyName}の事業に特化した内容で回答してください。
数値や固有名詞を含め、具体的に記載してください。`,
        },
      ],
    })

    return NextResponse.json({
      data: object,
      company: {
        name: companyName,
        industry: industryQuery,
      },
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
