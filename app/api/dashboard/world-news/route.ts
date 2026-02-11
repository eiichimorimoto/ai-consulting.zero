import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createAnthropic } from "@ai-sdk/anthropic"
import { generateObject } from "ai"
import { z } from "zod"
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { applyRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

const braveNewsSearch = async (query: string, count = 5): Promise<any[]> => {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (!key) return []
  const endpoint = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${count}`
  
  try {
    const resp = await fetchWithRetry(
      endpoint,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": key,
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
      12_000,
      3
    )
    
    if (!resp.ok) {
      console.warn(`⚠️ Brave News Search returned status ${resp.status} for query: ${query}`)
      return []
    }
    
    const json: any = await resp.json()
    return json?.results || []
  } catch (error) {
    console.error(`❌ Brave News Search error for query "${query}":`, error)
    return []
  }
}

const worldNewsSchema = z.object({
  categories: z.array(z.object({
    category: z.enum(["industry_world", "economy", "geopolitics", "conflict", "ai"]).describe("カテゴリ"),
    title: z.string().describe("見出し"),
    items: z.array(z.object({
      headline: z.string().describe("ニュース見出し"),
      summary: z.string().describe("要約"),
      impact: z.string().describe("当該業界への影響"),
      direction: z.enum(["positive", "negative", "neutral"]).describe("影響の方向性"),
      source: z.string().describe("情報源"),
    })).describe("ニュース項目"),
  })).describe("カテゴリ別ニュース（順序: 業界世界情勢, 世界/日本経済動向, 地政学, 紛争, AI/生成AI技術の進展）"),
  overallImpact: z.object({
    summary: z.string().describe("総合的な影響サマリー"),
    riskLevel: z.enum(["high", "medium", "low"]).describe("リスクレベル"),
    opportunities: z.array(z.string()).describe("機会"),
    threats: z.array(z.string()).describe("脅威"),
  }).describe("総合影響分析"),
})

export async function GET(request: Request) {
  const rateLimitError = applyRateLimit(request, 'dashboard')
  if (rateLimitError) return rateLimitError

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

    const companyId = profile.company_id

    const { data: company } = await supabase
      .from('companies')
      .select('name, industry, business_description')
      .eq('id', companyId)
      .single()

    if (!company) {
      return NextResponse.json(
        { error: "会社情報が見つかりません" },
        { status: 404 }
      )
    }

    const industryQuery = company.industry || ''

    // 強制更新でない場合、キャッシュから返す（有効期限: 30分）
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    if (!forceRefresh) {
      const cacheExpiry = new Date()
      cacheExpiry.setMinutes(cacheExpiry.getMinutes() - 30)
      const { data: cachedRow } = await supabase
        .from('dashboard_data')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('data_type', 'world-news')
        .gte('updated_at', cacheExpiry.toISOString())
        .maybeSingle()
      if (cachedRow?.data) {
        const payload = cachedRow.data as { data: unknown; company?: unknown; updatedAt?: string }
        return NextResponse.json({
          ...payload,
          updatedAt: payload.updatedAt || cachedRow.updated_at,
          cached: true
        })
      }
    }
    const businessDesc = company.business_description || ''

    // 5カテゴリの情報を並列収集（順序: 業界世界情勢, 世界/日本経済動向, 地政学, 紛争, AI/生成AI）
    const searchPromises = [
      // 1. 業界世界情勢
      braveNewsSearch(`${industryQuery} 業界 世界 動向 情勢`, 5),
      braveNewsSearch(`業界 世界情勢 グローバル トレンド 2025`, 5),
      // 2. 世界/日本経済動向
      braveNewsSearch(`世界経済 景気 動向 日本企業 影響`, 5),
      braveNewsSearch(`為替 円安 円高 ${industryQuery} 影響`, 5),
      braveNewsSearch(`日本経済 景気 動向 2025`, 5),
      // 3. 地政学
      braveNewsSearch(`地政学リスク サプライチェーン 企業 影響`, 5),
      braveNewsSearch(`地政学 国際政治 経済 影響 2025`, 5),
      // 4. 紛争（世界紛争リスク）
      braveNewsSearch(`紛争 世界 リスク 経済 影響`, 5),
      braveNewsSearch(`国際紛争 貿易 日本企業 影響`, 5),
      // 5. AI/生成AI技術の進展
      braveNewsSearch(`AI 人工知能 ビジネス活用 最新 2025`, 5),
      braveNewsSearch(`生成AI ChatGPT 企業 導入 影響`, 5),
    ]

    const searchResults = await Promise.all(searchPromises)

    const formatNews = (news: any[]) => news
      .slice(0, 6)
      .map((r: any) => `[${r.url || ''}] ${r.title || ''}: ${r.description || ''}`)
      .join('\n')

    const searchContext = `
【企業情報】
会社名: ${company.name}
業種: ${industryQuery || '不明'}
事業内容: ${businessDesc || '不明'}

【1. 業界世界情勢】
${formatNews([...searchResults[0], ...searchResults[1]])}

【2. 世界/日本経済動向】
${formatNews([...searchResults[2], ...searchResults[3], ...searchResults[4]])}

【3. 地政学】
${formatNews([...searchResults[5], ...searchResults[6]])}

【4. 紛争（世界紛争リスク）】
${formatNews([...searchResults[7], ...searchResults[8]])}

【5. AI/生成AI技術の進展】
${formatNews([...searchResults[9], ...searchResults[10]])}
`.trim()

    // AIで分析
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
      schema: worldNewsSchema,
      messages: [
        {
          role: "user",
          content: `以下の企業情報と収集したニュースを基に、世界情勢が当該企業・業界に与える影響を分析してください。

【本日の日付】${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
※ 日付・期間を含む記載は本日を起点とすること

${searchContext}

【分析要件】
以下の5カテゴリを、この順序の通りに出力してください：

1. 業界世界情勢 (industry_world)
   - 業界と世界の情勢・トレンド
   - 当該業界へのグローバルな影響

2. 世界/日本経済動向 (economy)
   - 世界経済・日本経済の動向
   - 為替変動の影響

3. 地政学 (geopolitics)
   - 地政学リスク、国際政治と経済
   - サプライチェーン等への影響

4. 紛争 (conflict)
   - 世界紛争リスク、国際紛争・貿易摩擦
   - 企業活動へのリスク

5. AI/生成AI技術の進展 (ai)
   - 生成AI、ChatGPT等の最新動向
   - 業務効率化・自動化への影響

各カテゴリで1-2件の重要なニュースを抽出し、当該企業・業界への具体的な影響を分析してください。
direction: "positive"(好影響), "negative"(悪影響), "neutral"(中立)

最後に総合的な影響分析を行ってください。
すべて日本語で回答してください。`,
        },
      ],
    })

    const updatedAt = new Date().toISOString()
    const payload = {
      data: object,
      company: {
        name: company.name,
        industry: company.industry,
      },
      updatedAt
    }

    await supabase
      .from('dashboard_data')
      .upsert({
        user_id: user.id,
        company_id: companyId,
        data_type: 'world-news',
        data: payload,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }, {
        onConflict: 'user_id,company_id,data_type'
      })

    return NextResponse.json({
      ...payload,
      cached: false
    })

  } catch (error) {
    console.error('World news error:', error)
    return NextResponse.json(
      {
        error: "世界情勢の取得に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
