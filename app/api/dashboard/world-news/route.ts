import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
      .select('name, industry, business_description, main_products')
      .eq('id', profile.company_id)
      .single()

    if (!company) {
      return NextResponse.json(
        { error: "会社情報が見つかりません" },
        { status: 404 }
      )
    }

    // 業界・製品に影響するニュースを検索（会社情報を活用）
    const industryQuery = company.industry || ''
    const businessDesc = company.business_description || ''
    const companyName = company.name || ''
    
    // 会社情報から検索キーワードを構築
    const searchContext = [industryQuery, businessDesc].filter(Boolean).join(' ') || companyName
    
    const queries = [
      searchContext ? `${searchContext} 経済 ニュース 2025 影響` : `${companyName} 業界 経済 ニュース`,
      searchContext ? `${searchContext} 紛争 影響 リスク` : `${companyName} 業界 リスク`,
      searchContext ? `${searchContext} 政策 変更 規制` : `${companyName} 業界 政策`,
      industryQuery ? `${industryQuery} 業界 動向 ニュース 2025` : `${companyName} 業界 動向`,
      ...(company.main_products || []).slice(0, 2).map((product: string) => 
        `${product} 市場 動向 2025`
      ),
    ]

    const allResults: any[] = []
    for (const q of queries) {
      const results = await braveNewsSearch(q, 5)
      allResults.push(...results)
    }

    // 重複を除去し、注目度が高いもの3-5件を返す
    const uniqueResults = new Map<string, any>()
    for (const r of allResults) {
      if (r.url && !uniqueResults.has(r.url)) {
        uniqueResults.set(r.url, {
          title: r.title || '',
          url: r.url || '',
          description: r.description || '',
          published: r.age || '',
          category: categorizeNews(r.title || r.description || '')
        })
      }
    }

    const news = Array.from(uniqueResults.values()).slice(0, 5)

    return NextResponse.json({
      data: news,
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

function categorizeNews(text: string): 'economy' | 'policy' | 'market' {
  if (text.includes('経済') || text.includes('GDP') || text.includes('PMI')) {
    return 'economy'
  }
  if (text.includes('政策') || text.includes('規制') || text.includes('法')) {
    return 'policy'
  }
  return 'market'
}

