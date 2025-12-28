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

// 業界動向データを取得（ログイン起点で3ヶ月遡り週別）
async function getIndustryTrends(industry: string, loginDate: Date) {
  // 3ヶ月前から現在まで、週別データを生成
  const weeks: { week: string; date: Date }[] = []
  const startDate = new Date(loginDate)
  startDate.setMonth(startDate.getMonth() - 3)
  
  const currentDate = new Date(startDate)
  while (currentDate <= loginDate) {
    weeks.push({
      week: `${currentDate.getMonth() + 1}/${currentDate.getDate()}週`,
      date: new Date(currentDate)
    })
    currentDate.setDate(currentDate.getDate() + 7)
  }

  // 業界キーワードで検索
  const queries = [
    `${industry} 需要 動向 2024 2025`,
    `${industry} 輸出 動向`,
    `${industry} 国内 需要 推移`,
  ]

  const results: any[] = []
  for (const q of queries) {
    const searchResults = await braveWebSearch(q, 5)
    results.push(...searchResults)
  }

  // 週別データを生成（モックデータ、実際には検索結果から抽出）
  const domesticData = weeks.map((w, i) => ({
    week: w.week,
    value: 98 + (i * 0.5) + Math.random() * 2
  }))

  const exportData = weeks.map((w, i) => ({
    week: w.week,
    value: 95 + (i * 1.2) + Math.random() * 2
  }))

  return {
    domestic: domesticData,
    export: exportData,
    sources: results.slice(0, 5)
  }
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
      .select('industry')
      .eq('id', profile.company_id)
      .single()

    const industry = company?.industry || '製造業'
    const loginDate = new Date()

    const trends = await getIndustryTrends(industry, loginDate)

    return NextResponse.json({
      data: trends,
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

