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

// マーケットデータを取得（ログイン日を起点に週別データを生成）
async function getMarketData(loginDate: Date) {
  const weeks: { week: string; date: Date }[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(loginDate)
    d.setDate(d.getDate() - i * 7)
    weeks.push({
      week: `${d.getMonth() + 1}/${d.getDate()}週`,
      date: d
    })
  }

  // 実際のデータ取得は外部APIを使用（ここではモックデータを返す）
  // 本番環境では、金融データAPI（例：Yahoo Finance API、Alpha Vantage等）を使用
  const usdJpy = weeks.map((w, i) => ({
    week: w.week,
    date: w.date.toISOString(),
    value: 156.42 - (7 - i) * 0.2 + Math.random() * 0.4
  }))

  const nikkei = weeks.map((w, i) => ({
    week: w.week,
    date: w.date.toISOString(),
    value: 39847 - (7 - i) * 200 + Math.random() * 400
  }))

  const longRate = weeks.map((w, i) => ({
    week: w.week,
    date: w.date.toISOString(),
    value: 1.085 - (7 - i) * 0.01 + Math.random() * 0.02
  }))

  const shortRate = weeks.map((w, i) => ({
    week: w.week,
    date: w.date.toISOString(),
    value: 0.25 - (7 - i) * 0.02 + Math.random() * 0.03
  }))

  return {
    usdJpy,
    nikkei,
    longRate,
    shortRate
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

    const companyId = profile?.company_id || null

    // 強制更新パラメータをチェック
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'

    // 強制更新でない場合、キャッシュからデータを取得（有効期限: 5分）
    if (!forceRefresh) {
      const cacheExpiry = new Date()
      cacheExpiry.setMinutes(cacheExpiry.getMinutes() - 5)

      const { data: cachedData } = await supabase
        .from('dashboard_data')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('data_type', 'market')
        .gte('updated_at', cacheExpiry.toISOString())
        .maybeSingle()

      if (cachedData?.data) {
        return NextResponse.json({
          data: cachedData.data,
          updatedAt: cachedData.updated_at,
          cached: true
        })
      }
    }

    // ログイン日を取得（実際にはユーザーの最終ログイン日を使用）
    // ここでは現在日時を使用
    const loginDate = new Date()

    const marketData = await getMarketData(loginDate)

    // データをSupabaseに保存（UPSERT）
    const { error: saveError } = await supabase
      .from('dashboard_data')
      .upsert({
        user_id: user.id,
        company_id: companyId,
        data_type: 'market',
        data: marketData,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5分後
      }, {
        onConflict: 'user_id,company_id,data_type'
      })

    if (saveError) {
      console.error('Failed to save market data:', saveError)
      // 保存エラーでもデータは返す
    }

    return NextResponse.json({
      data: marketData,
      updatedAt: new Date().toISOString(),
      cached: false
    })

  } catch (error) {
    console.error('Market data error:', error)
    return NextResponse.json(
      {
        error: "マーケットデータの取得に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

