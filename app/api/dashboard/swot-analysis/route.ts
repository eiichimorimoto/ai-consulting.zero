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
  strengths: z.array(z.object({
    point: z.string().describe("強みの内容"),
    evidence: z.string().describe("根拠・出典"),
  })).describe("強み"),
  weaknesses: z.array(z.object({
    point: z.string().describe("弱みの内容"),
    evidence: z.string().describe("根拠・出典"),
  })).describe("弱み"),
  opportunities: z.array(z.object({
    point: z.string().describe("機会の内容"),
    evidence: z.string().describe("根拠・出典"),
  })).describe("機会"),
  threats: z.array(z.object({
    point: z.string().describe("脅威の内容"),
    evidence: z.string().describe("根拠・出典"),
  })).describe("脅威"),
  competitors: z.array(z.object({
    name: z.string().describe("競合企業名"),
    strength: z.string().describe("競合の強み"),
    comparison: z.string().describe("自社との比較"),
  })).describe("主要競合企業"),
  industryPosition: z.object({
    ranking: z.string().describe("業界内の位置付け"),
    marketShare: z.string().describe("市場シェア/占有率"),
    differentiation: z.string().describe("差別化要因"),
  }).describe("業界内ポジション"),
  reputation: z.object({
    overall: z.string().describe("総合評価"),
    positives: z.array(z.string()).describe("良い評判"),
    negatives: z.array(z.string()).describe("悪い評判"),
    sources: z.array(z.string()).describe("情報源"),
  }).describe("SNS/口コミ評判"),
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
      .select('name, industry, website, business_description, retrieved_info, prefecture, employee_count, annual_revenue')
      .eq('id', profile.company_id)
      .single()

    if (!company) {
      return NextResponse.json(
        { error: "会社情報が見つかりません" },
        { status: 404 }
      )
    }

    // 多角的な外部情報を収集
    const industryQuery = company.industry || ''
    const businessDesc = company.business_description || ''
    
    // 並列で複数の検索を実行
    const searchPromises = [
      // 競合分析
      braveWebSearch(`${company.name} 競合 ライバル企業 比較`, 5),
      braveWebSearch(`${industryQuery} 業界 大手企業 ランキング シェア`, 5),
      // 強み・HP/社長情報
      braveWebSearch(`${company.name} 強み 特徴 技術力 実績`, 5),
      braveWebSearch(`${company.name} 代表取締役 社長 経営者 理念`, 3),
      // 市場機会・取引先
      braveWebSearch(`${company.name} 取引先 顧客 大手企業`, 5),
      braveWebSearch(`${industryQuery} 市場規模 成長率 2025 予測`, 5),
      // SNS・口コミ評判
      braveWebSearch(`${company.name} 評判 口コミ レビュー`, 5),
      braveWebSearch(`${company.name} Google評価 クチコミ`, 3),
      braveWebSearch(`${company.name} 転職 社員 評判`, 3),
      // 業界ポジション
      braveWebSearch(`${industryQuery} ${company.prefecture || ''} 企業 シェア 占有率`, 5),
    ]

    const searchResults = await Promise.all(searchPromises)
    
    // カテゴリ別に整理
    const competitorResults = [...searchResults[0], ...searchResults[1]]
    const strengthResults = [...searchResults[2], ...searchResults[3]]
    const opportunityResults = [...searchResults[4], ...searchResults[5]]
    const reputationResults = [...searchResults[6], ...searchResults[7], ...searchResults[8]]
    const positionResults = searchResults[9]

    // 検索結果をテキストにまとめる
    const formatResults = (results: any[]) => results
      .slice(0, 8)
      .map((r: any) => `[${r.url || ''}] ${r.title || ''}: ${r.description || ''}`)
      .join('\n')

    const companyInfo = `
【企業基本情報】
会社名: ${company.name}
業種: ${company.industry || '不明'}
所在地: ${company.prefecture || '不明'}
従業員数: ${company.employee_count || '不明'}
売上規模: ${company.annual_revenue || '不明'}
事業内容: ${company.business_description || '不明'}
Webサイト: ${company.website || 'なし'}
取得情報: ${company.retrieved_info ? JSON.stringify(company.retrieved_info) : 'なし'}

【競合・業界情報】
${formatResults(competitorResults)}

【強み・経営者情報】
${formatResults(strengthResults)}

【市場機会・取引先情報】
${formatResults(opportunityResults)}

【SNS・口コミ評判】
${formatResults(reputationResults)}

【業界ポジション情報】
${formatResults(positionResults)}
`.trim()

    // AIで包括的なSWOT分析を実行
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
          content: `以下の企業情報と収集した外部情報を基に、包括的なSWOT分析を行ってください。

${companyInfo}

【分析要件】

1. 強み (Strengths) - 各3項目
   - HPにおける社長・経営者の情報、企業理念、技術力から推定
   - 実績、受賞歴、特許などの客観的根拠を含める
   - 取引先に大手企業があれば強みとして記載

2. 弱み (Weaknesses) - 各3項目
   - 競合との比較における劣位点
   - 口コミ・評判から見える課題
   - 市場での認知度や規模の課題

3. 機会 (Opportunities) - 各3項目
   - 業界における需要動向と成長機会
   - 取引先大手企業との取引拡大可能性
   - 市場シェア拡大の余地

4. 脅威 (Threats) - 各3項目
   - 主要競合企業の動向
   - 業界の構造変化リスク
   - 経済環境・技術変化による影響

5. 競合企業分析 - 主要3社
   - 競合企業名と強み
   - この企業との比較ポイント

6. 業界内ポジション
   - 業界内でのランキング・位置付け
   - 推定市場シェア・占有率
   - 差別化要因

7. SNS/口コミ評判
   - Google評価やSNSでの総合的な評判
   - 良い評判（3つ）
   - 改善点・ネガティブな評判（3つ）
   - 情報源

すべて日本語で、具体的な数値や固有名詞を含めて回答してください。`,
        },
      ],
    })

    return NextResponse.json({
      data: object,
      company: {
        name: company.name,
        industry: company.industry,
        prefecture: company.prefecture,
      },
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
