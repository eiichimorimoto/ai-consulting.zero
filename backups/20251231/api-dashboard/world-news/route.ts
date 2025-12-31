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

const braveNewsSearch = async (query: string, count = 5): Promise<any[]> => {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (!key) return []
  const endpoint = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${count}`
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
  return json?.results || []
}

const worldNewsSchema = z.object({
  categories: z.array(z.object({
    category: z.enum(["it_tech", "ai", "economy", "conflict", "software"]).describe("カテゴリ"),
    title: z.string().describe("見出し"),
    items: z.array(z.object({
      headline: z.string().describe("ニュース見出し"),
      summary: z.string().describe("要約"),
      impact: z.string().describe("当該業界への影響"),
      direction: z.enum(["positive", "negative", "neutral"]).describe("影響の方向性"),
      source: z.string().describe("情報源"),
    })).describe("ニュース項目"),
  })).describe("カテゴリ別ニュース"),
  overallImpact: z.object({
    summary: z.string().describe("総合的な影響サマリー"),
    riskLevel: z.enum(["high", "medium", "low"]).describe("リスクレベル"),
    opportunities: z.array(z.string()).describe("機会"),
    threats: z.array(z.string()).describe("脅威"),
  }).describe("総合影響分析"),
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
      .select('name, industry, business_description')
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

    // 5カテゴリの情報を並列収集
    const searchPromises = [
      // IT技術者の動き
      braveNewsSearch(`IT技術者 採用 動向 2025`, 5),
      braveNewsSearch(`${industryQuery} DX デジタル化 IT投資`, 5),
      // AI関連
      braveNewsSearch(`AI 人工知能 ビジネス活用 最新 2025`, 5),
      braveNewsSearch(`生成AI ChatGPT 企業 導入 影響`, 5),
      // 新技術・注目ソフト
      braveNewsSearch(`注目 ソフトウェア SaaS 新サービス 2025`, 5),
      braveNewsSearch(`${industryQuery} 新技術 イノベーション`, 5),
      // 経済状況
      braveNewsSearch(`世界経済 景気 動向 日本企業 影響`, 5),
      braveNewsSearch(`為替 円安 円高 ${industryQuery} 影響`, 5),
      // 紛争・地政学リスク
      braveNewsSearch(`紛争 地政学リスク サプライチェーン 影響`, 5),
      braveNewsSearch(`米中 貿易 関税 日本企業 影響`, 5),
    ]

    const searchResults = await Promise.all(searchPromises)
    
    // カテゴリ別に整理
    const itTechNews = [...searchResults[0], ...searchResults[1]]
    const aiNews = [...searchResults[2], ...searchResults[3]]
    const softwareNews = [...searchResults[4], ...searchResults[5]]
    const economyNews = [...searchResults[6], ...searchResults[7]]
    const conflictNews = [...searchResults[8], ...searchResults[9]]

    const formatNews = (news: any[]) => news
      .slice(0, 6)
      .map((r: any) => `[${r.url || ''}] ${r.title || ''}: ${r.description || ''}`)
      .join('\n')

    const searchContext = `
【企業情報】
会社名: ${company.name}
業種: ${industryQuery || '不明'}
事業内容: ${businessDesc || '不明'}

【IT技術者・DX動向】
${formatNews(itTechNews)}

【AI・生成AI動向】
${formatNews(aiNews)}

【新技術・注目ソフトウェア】
${formatNews(softwareNews)}

【経済状況・為替動向】
${formatNews(economyNews)}

【紛争・地政学リスク】
${formatNews(conflictNews)}
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

${searchContext}

【分析要件】
以下の5カテゴリについて、それぞれ分析してください：

1. IT技術者の動き (it_tech)
   - IT人材の採用動向、DX投資の動き
   - 当該業界のデジタル化への影響

2. AI関連の動き (ai)
   - 生成AI、ChatGPT等の最新動向
   - 業務効率化・自動化への影響

3. 新技術・注目ソフトウェア (software)
   - 注目のSaaS、業務ソフト
   - 業界特化の新技術

4. 経済状況 (economy)
   - 世界経済の動向
   - 為替変動の影響

5. 紛争・地政学リスク (conflict)
   - 国際紛争・貿易摩擦
   - サプライチェーンへの影響

各カテゴリで1-2件の重要なニュースを抽出し、当該企業・業界への具体的な影響を分析してください。
direction: "positive"(好影響), "negative"(悪影響), "neutral"(中立)

最後に総合的な影響分析を行ってください。
すべて日本語で回答してください。`,
        },
      ],
    })

    return NextResponse.json({
      data: object,
      company: {
        name: company.name,
        industry: company.industry,
      },
      updatedAt: new Date().toISOString()
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
