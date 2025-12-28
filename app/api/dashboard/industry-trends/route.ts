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

const industryTrendSchema = z.object({
  trends: z.array(z.object({
    category: z.string().describe("動向カテゴリ（需要動向、輸出動向、価格動向、技術動向、人材動向など）"),
    title: z.string().describe("トレンドのタイトル"),
    description: z.string().describe("詳細説明"),
    direction: z.enum(["up", "down", "stable"]).describe("上向き、下向き、横ばい"),
    strength: z.enum(["strong", "moderate", "weak"]).describe("変化の強さ"),
    impact: z.string().describe("企業への影響"),
    source: z.string().describe("情報源"),
  })).describe("業界トレンド一覧"),
  summary: z.object({
    overallDirection: z.enum(["up", "down", "stable"]).describe("業界全体の方向性"),
    outlook: z.string().describe("今後の見通し"),
    keyFactors: z.array(z.string()).describe("注目すべき要因"),
  }).describe("サマリー"),
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
      .select('name, industry, business_description, prefecture')
      .eq('id', profile.company_id)
      .single()

    const industry = company?.industry || ''
    const businessDesc = company?.business_description || ''

    // 業界動向を多角的に検索
    const searchPromises = [
      braveWebSearch(`${industry} 需要 動向 2025 予測`, 5),
      braveWebSearch(`${industry} 輸出 海外 動向`, 5),
      braveWebSearch(`${industry} 価格 相場 推移`, 5),
      braveWebSearch(`${industry} 技術 トレンド 新技術`, 5),
      braveWebSearch(`${industry} 人材 採用 動向`, 5),
      braveWebSearch(`${industry} 市場規模 成長率`, 5),
    ]

    const searchResults = await Promise.all(searchPromises)
    
    // 検索結果を整理
    const allResults = searchResults.flat()
    const searchText = allResults
      .slice(0, 20)
      .map((r: any) => `[${r.url || ''}] ${r.title || ''}: ${r.description || ''}`)
      .join('\n')

    // AIで業界動向を分析
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
      schema: industryTrendSchema,
      messages: [
        {
          role: "user",
          content: `以下の企業情報と検索結果を基に、業界動向を分析してください。

【企業情報】
会社名: ${company?.name || '不明'}
業種: ${industry || '不明'}
事業内容: ${businessDesc || '不明'}
所在地: ${company?.prefecture || '不明'}

【検索結果】
${searchText}

【分析要件】
以下の6カテゴリについて、それぞれトレンドを分析してください：

1. 需要動向 - 国内需要の増減傾向
2. 輸出動向 - 海外市場・輸出の動向
3. 価格動向 - 製品・サービス価格の推移
4. 技術動向 - 業界の技術革新・新技術
5. 人材動向 - 業界の人材需給・採用状況
6. 市場規模 - 市場全体の成長・縮小傾向

各トレンドについて：
- direction: "up"(上昇/好調), "down"(下降/低調), "stable"(横ばい)
- strength: "strong"(強い変化), "moderate"(中程度), "weak"(弱い変化)
- impact: この企業への具体的な影響

サマリーでは業界全体の方向性と今後の見通しを示してください。
すべて日本語で、具体的な数値や固有名詞を含めて回答してください。`,
        },
      ],
    })

    return NextResponse.json({
      data: object,
      company: {
        name: company?.name,
        industry: industry,
      },
      updatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Industry trends error:', error)
    return NextResponse.json(
      {
        error: "業界動向の取得に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
