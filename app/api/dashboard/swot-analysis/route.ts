import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createAnthropic } from "@ai-sdk/anthropic"
import { generateObject } from "ai"
import { z } from "zod"
import { checkAIResult } from "@/lib/fact-checker"
import { fetchWithRetry } from '@/lib/fetch-with-retry'

export const runtime = "nodejs"

const braveWebSearch = async (query: string, count = 5): Promise<any[]> => {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (!key) return []
  const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`
  
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
      console.warn(`⚠️ Brave Search returned status ${resp.status} for query: ${query}`)
      return []
    }
    
    const json: any = await resp.json()
    return json?.web?.results || []
  } catch (error) {
    console.error(`❌ Brave Search error for query "${query}":`, error)
    return []
  }
}

const swotSchema = z.object({
  strengths: z.array(z.object({
    point: z.string().describe("強みの内容（80文字以内で具体的に説明）"),
    evidence: z.string().describe("根拠（30文字以内）"),
  })).max(3).describe("強み（3項目まで）"),
  weaknesses: z.array(z.object({
    point: z.string().describe("弱みの内容（80文字以内で具体的に説明）"),
    evidence: z.string().describe("根拠（30文字以内）"),
  })).max(3).describe("弱み（3項目まで）"),
  opportunities: z.array(z.object({
    point: z.string().describe("機会の内容（80文字以内で具体的に説明）"),
    evidence: z.string().describe("根拠（30文字以内）"),
  })).max(3).describe("機会（3項目まで）"),
  threats: z.array(z.object({
    point: z.string().describe("脅威の内容（80文字以内で具体的に説明）"),
    evidence: z.string().describe("根拠（30文字以内）"),
  })).max(3).describe("脅威（3項目まで）"),
  competitors: z.array(z.object({
    name: z.string().describe("想定競合企業名"),
    strength: z.string().describe("競合の強み（20文字以内）"),
    comparison: z.string().describe("自社との比較（20文字以内）"),
    reason: z.string().describe("競合と想定した理由（15文字以内）"),
  })).max(3).describe("想定競合企業（3社まで）"),
  industryPosition: z.object({
    ranking: z.string().describe("業界内の位置付け（15文字以内）"),
    marketShare: z.string().describe("市場シェア（10文字以内）"),
    differentiation: z.string().describe("差別化要因（20文字以内）"),
  }).describe("業界内ポジション"),
  reputation: z.object({
    overall: z.string().describe("総合評価（20文字以内）"),
    positives: z.array(z.object({
      comment: z.string().describe("良い評判の内容（30文字以内）"),
      source: z.string().describe("出典（URL、サイト名、またはプラットフォーム名）"),
    })).min(5).max(5).describe("良い評判（必ず5項目）"),
    negatives: z.array(z.object({
      comment: z.string().describe("悪い評判の内容（30文字以内）"),
      source: z.string().describe("出典（URL、サイト名、またはプラットフォーム名）"),
    })).min(5).max(5).describe("悪い評判（必ず5項目）"),
  }).describe("SNS/口コミ評判（良い評判5つ + 悪い評判5つ = 合計必ず10項目）"),
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
    const prefecture = company.prefecture || ''
    
    // 会社情報から製品・サービスキーワードを抽出
    const retrievedInfo = company.retrieved_info as any
    let productKeywords: string[] = []
    
    // retrieved_infoから製品情報を抽出
    if (retrievedInfo) {
      if (retrievedInfo.products) productKeywords.push(...(Array.isArray(retrievedInfo.products) ? retrievedInfo.products : [retrievedInfo.products]))
      if (retrievedInfo.services) productKeywords.push(...(Array.isArray(retrievedInfo.services) ? retrievedInfo.services : [retrievedInfo.services]))
      if (retrievedInfo.main_products) productKeywords.push(retrievedInfo.main_products)
      if (retrievedInfo.business_areas) productKeywords.push(...(Array.isArray(retrievedInfo.business_areas) ? retrievedInfo.business_areas : [retrievedInfo.business_areas]))
    }
    
    // business_descriptionからキーワード抽出
    if (businessDesc) {
      const descKeywords = businessDesc.split(/[、,。・\s]+/).filter((k: string) => k.length >= 2 && k.length <= 15).slice(0, 5)
      productKeywords.push(...descKeywords)
    }
    
    // 重複除去
    productKeywords = [...new Set(productKeywords.filter(k => k && k.length > 1))].slice(0, 5)
    const productQuery = productKeywords.length > 0 ? productKeywords.slice(0, 3).join(' ') : businessDesc.slice(0, 30)
    
    console.log('🔍 競合分析用キーワード:', { productKeywords, productQuery, businessDesc })
    
    // 並列で複数の検索を実行（製品・サービス中心の検索）
    // 製品キーワードを明確に使用（下水道継手など具体的な製品名）
    const specificProductQuery = productKeywords.length > 0 
      ? productKeywords.join(' ') 
      : businessDesc.slice(0, 50)
    
    console.log('🔍 競合検索クエリ:', { specificProductQuery, productKeywords })
    
    const searchPromises = [
      // 競合分析（具体的な製品名で検索）
      braveWebSearch(`${specificProductQuery} メーカー 製造会社`, 5),
      braveWebSearch(`${specificProductQuery} 同業他社 競合`, 5),
      // 強み・HP/社長情報
      braveWebSearch(`${company.name} 強み 特徴 技術力 実績`, 5),
      braveWebSearch(`${company.name} 代表取締役 社長 経営者 理念`, 3),
      // 市場機会・取引先
      braveWebSearch(`${company.name} 取引先 顧客 大手企業`, 5),
      braveWebSearch(`${productQuery} 市場規模 成長率 2025 予測`, 5),
      // SNS・口コミ評判
      braveWebSearch(`${company.name} 評判 口コミ レビュー`, 5),
      braveWebSearch(`${company.name} Google評価 クチコミ`, 3),
      braveWebSearch(`${company.name} 転職 社員 評判`, 3),
      // 業界ポジション（製品ベース）
      braveWebSearch(`${productQuery} 企業 シェア ${prefecture}`, 5),
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

    // 製品・サービス情報を整理
    const productInfo = productKeywords.length > 0 
      ? productKeywords.join('、')
      : '情報なし'

    const companyInfo = `
【企業基本情報】
会社名: ${company.name}
業種: ${company.industry || '不明'}
所在地: ${company.prefecture || '不明'}
従業員数: ${company.employee_count || '不明'}名
売上規模: ${company.annual_revenue || '不明'}
事業内容: ${company.business_description || '不明'}
Webサイト: ${company.website || 'なし'}

【★重要★ この企業の製品・サービス（競合分析の軸）】
${productInfo}
※競合企業は上記の製品・サービスが類似する企業から選定すること

【取得情報（HPから収集）】
${company.retrieved_info ? JSON.stringify(company.retrieved_info, null, 2) : 'なし'}

【競合候補・市場情報（製品ベース検索結果）】
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

【本日の日付】${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
※ 日付を含む記載は必ず本日以降の未来日を使用すること

${companyInfo}

【分析要件】

【重要】全ての回答は具体的に。各項目60文字以内の1-2文で記載すること。

1. 強み (Strengths) - 3項目のみ
   - 各項目60文字以内で具体的に1-2文
   - 根拠は30文字以内

2. 弱み (Weaknesses) - 3項目のみ
   - 各項目60文字以内で具体的に1-2文
   - 根拠は30文字以内

3. 機会 (Opportunities) - 3項目のみ
   - 各項目60文字以内で具体的に1-2文
   - 根拠は30文字以内

4. 脅威 (Threats) - 3項目のみ
   - 各項目60文字以内で具体的に1-2文
   - 根拠は30文字以内

5. 想定競合企業 - 3社のみ
   【最重要】以下の条件を厳守すること：
   - ❌ 業界・業種だけで競合を特定しない（例: 建設業→大林組、鹿島建設は絶対不可）
   - ❌ 業界大手・上場企業・ゼネコンは対象外
   - ✅ 上記「製品・サービス」欄の具体的な製品（例：下水道継手、管継手、配管部品など）を製造する企業を選ぶ
   - ✅ 同じ製品カテゴリのメーカー・製造会社のみ
   - ✅ 企業規模（従業員数・売上）が近い中小企業を選ぶ
   - ✅ 地域（都道府県）が同じまたは近い企業を優先
   - 強み・理由は各20文字以内
   - 必ず「想定」と明示

6. 業界内ポジション
   - 各項目15〜20文字以内

7. SNS/口コミ評判（合計10項目必須）
   - 【必須】良い評判を必ず5項目生成すること（4項目以下は不可）
   - 【必須】悪い評判を必ず5項目生成すること（4項目以下は不可）
   - 各項目30文字以内
   - 【重要】各評判に必ず出典を明記（URLまたはサイト名）
   - 出典は検索結果から実際に見つかったものを使用
   - 情報が不足している場合は「情報不足」ではなく、検索結果から推測して10項目すべてを埋めること

すべて日本語で簡潔に回答。`,
        },
      ],
    })

    // ファクトチェックを実行（AI生成SWOT分析結果）
    const factCheckResult = checkAIResult({
      content: JSON.stringify(object),
      issues: [
        ...(object.strengths || []).map((s: any) => ({ severity: 'info', issue: s.title || s, category: 'strength' })),
        ...(object.weaknesses || []).map((w: any) => ({ severity: 'warning', issue: w.title || w, category: 'weakness' })),
        ...(object.opportunities || []).map((o: any) => ({ severity: 'info', issue: o.title || o, category: 'opportunity' })),
        ...(object.threats || []).map((t: any) => ({ severity: 'warning', issue: t.title || t, category: 'threat' })),
      ],
    })

    console.log("📋 SWOT分析ファクトチェック:", JSON.stringify(factCheckResult, null, 2))

    return NextResponse.json({
      data: object,
      company: {
        name: company.name,
        industry: company.industry,
        prefecture: company.prefecture,
      },
      updatedAt: new Date().toISOString(),
      factCheck: factCheckResult
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
