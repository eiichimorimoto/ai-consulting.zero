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

const swotSchema = z.object({
  strengths: z.array(z.string()).describe("強み"),
  weaknesses: z.array(z.string()).describe("弱み"),
  opportunities: z.array(z.string()).describe("機会"),
  threats: z.array(z.string()).describe("脅威"),
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
      .select('name, industry, website, business_description, retrieved_info')
      .eq('id', profile.company_id)
      .single()

    if (!company) {
      return NextResponse.json(
        { error: "会社情報が見つかりません" },
        { status: 404 }
      )
    }

    // 外部情報を検索（会社名・業種・事業内容を活用）
    const industryQuery = company.industry || ''
    const businessDesc = company.business_description || ''
    const companyContext = [company.name, industryQuery, businessDesc].filter(Boolean).join(' ')
    
    const queries = [
      `${company.name} 強み 特徴 事業`,
      `${company.name} 課題 問題 改善点`,
      companyContext ? `${companyContext} 市場 機会 2025 成長` : `${company.name} 市場 機会`,
      companyContext ? `${companyContext} リスク 脅威 競合` : `${company.name} 業界 リスク`,
      industryQuery ? `${industryQuery} 業界 動向 分析 2025` : `${company.name} 業界 動向`,
    ]

    const searchResults: any[] = []
    for (const q of queries) {
      const results = await braveWebSearch(q, 5)
      searchResults.push(...results)
    }

    // 検索結果をテキストにまとめる
    const searchText = searchResults
      .slice(0, 10)
      .map((r: any) => `${r.title || ''}\n${r.description || ''}`)
      .join('\n\n')

    const companyInfo = `
会社名: ${company.name}
業種: ${company.industry || '不明'}
事業内容: ${company.business_description || '不明'}
取得情報: ${company.retrieved_info ? JSON.stringify(company.retrieved_info) : 'なし'}
外部検索結果:
${searchText}
`.trim()

    // AIでSWOT分析を実行
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
      schema: swotSchema,
      messages: [
        {
          role: "user",
          content: `以下の会社情報と外部検索結果を基に、SWOT分析を行ってください。

${companyInfo}

【分析要件】
- 強み: 会社の優位性、技術力、実績など
- 弱み: 課題、不足している要素、改善点など
- 機会: 市場の成長機会、新規事業の可能性など
- 脅威: 競合、市場環境の変化、リスクなど

各項目は2-3個の具体的な内容を抽出してください。`,
        },
      ],
    })

    return NextResponse.json({
      data: object,
      sources: searchResults.slice(0, 5),
      updatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('SWOT analysis error:', error)
    return NextResponse.json(
      {
        error: "SWOT分析の取得に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

