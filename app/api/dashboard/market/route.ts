import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getForexRate, getNikkeiProxy, generateWeeklyData } from '@/lib/alphavantage'

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

// マーケットデータを取得（Alpha Vantage APIを使用）
async function getMarketData(loginDate: Date) {
  console.log('💱 Alpha Vantage API: マーケットデータ取得開始...')
  
  // 1. USD/JPY為替レートを取得（実データ）
  const forexData = await getForexRate('USD', 'JPY')
  const currentRate = forexData?.rate || 156.42 // フォールバック値
  
  if (forexData) {
    console.log(`✅ 為替レート: ${forexData.symbol} = ${currentRate}円`)
  } else {
    console.warn('⚠️ 為替データ取得失敗。フォールバック値を使用:', currentRate)
  }
  
  // Alpha Vantage APIのレート制限対策: 1秒待機
  console.log('⏱️ レート制限対策: 1秒待機中...')
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 2. 日経平均（EWJ ETF）を取得（実データ）
  const nikkeiData = await getNikkeiProxy()
  const currentNikkei = nikkeiData?.price || 39847 // フォールバック値
  
  if (nikkeiData) {
    console.log(`✅ 日経平均: ${currentNikkei}円 (${nikkeiData.change > 0 ? '+' : ''}${nikkeiData.change})`)
  } else {
    console.warn('⚠️ 日経平均データ取得失敗。フォールバック値を使用:', currentNikkei)
  }
  
  // 3. 週別データを生成（現在値から過去推定）
  const usdJpyWeekly = generateWeeklyData(currentRate, 8)
  const nikkeiWeekly = generateWeeklyData(currentNikkei, 8)
  
  // 4. 金利データ（実APIがないため、固定値を使用）
  // TODO: API Ninjas等の金利APIを検討
  const longRateBase = 1.085
  const shortRateBase = 0.25
  const longRateWeekly = generateWeeklyData(longRateBase, 8)
  const shortRateWeekly = generateWeeklyData(shortRateBase, 8)
  
  // 5. 週別データにdateを追加
  const weeks: { week: string; date: Date }[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(loginDate)
    d.setDate(d.getDate() - i * 7)
    weeks.push({
      week: `${d.getMonth() + 1}/${d.getDate()}週`,
      date: d
    })
  }

  const usdJpy = usdJpyWeekly.map((item, i) => ({
    week: item.week,
    date: weeks[i].date.toISOString(),
    value: item.value
  }))

  const nikkei = nikkeiWeekly.map((item, i) => ({
    week: item.week,
    date: weeks[i].date.toISOString(),
    value: item.value
  }))

  const longRate = longRateWeekly.map((item, i) => ({
    week: item.week,
    date: weeks[i].date.toISOString(),
    value: item.value
  }))

  const shortRate = shortRateWeekly.map((item, i) => ({
    week: item.week,
    date: weeks[i].date.toISOString(),
    value: item.value
  }))
  
  console.log('✅ Alpha Vantage API: マーケットデータ取得完了')
  console.log({
    apiSource: 'Alpha Vantage',
    currentRate,
    currentNikkei,
    longRateBase,
    shortRateBase,
    timestamp: new Date().toISOString()
  })

  return {
    usdJpy,
    nikkei,
    longRate,
    shortRate,
    currentRate
  }
}

// 業種別の関連原材料マッピング
const industryMaterials: Record<string, { key: string; name: string; unit: string; basePrice: number; volatility: number }[]> = {
  // 製造業
  '製造業': [
    { key: 'steel', name: '鉄鋼', unit: '$/t', basePrice: 680, volatility: 20 },
    { key: 'aluminum', name: 'アルミ', unit: '$/t', basePrice: 2340, volatility: 50 },
    { key: 'copper', name: '銅', unit: '$/t', basePrice: 8950, volatility: 100 },
    { key: 'oil', name: '原油(WTI)', unit: '$/バレル', basePrice: 72.5, volatility: 2 },
  ],
  // 食品・飲料
  '食品': [
    { key: 'wheat', name: '小麦', unit: '$/ブッシェル', basePrice: 580, volatility: 15 },
    { key: 'corn', name: 'トウモロコシ', unit: '$/ブッシェル', basePrice: 450, volatility: 12 },
    { key: 'sugar', name: '砂糖', unit: '¢/ポンド', basePrice: 22.5, volatility: 1.5 },
    { key: 'dairy', name: '乳製品', unit: '$/100kg', basePrice: 420, volatility: 25 },
  ],
  '飲料': [
    { key: 'coffee', name: 'コーヒー豆', unit: '¢/ポンド', basePrice: 185, volatility: 8 },
    { key: 'sugar', name: '砂糖', unit: '¢/ポンド', basePrice: 22.5, volatility: 1.5 },
    { key: 'wheat', name: '小麦', unit: '$/ブッシェル', basePrice: 580, volatility: 15 },
    { key: 'packaging', name: '包装資材', unit: '円/kg', basePrice: 180, volatility: 10 },
  ],
  // 建設・不動産
  '建設業': [
    { key: 'steel', name: '鉄鋼', unit: '$/t', basePrice: 680, volatility: 20 },
    { key: 'cement', name: 'セメント', unit: '円/t', basePrice: 12500, volatility: 500 },
    { key: 'lumber', name: '木材', unit: '$/1000BF', basePrice: 520, volatility: 30 },
    { key: 'copper', name: '銅', unit: '$/t', basePrice: 8950, volatility: 100 },
  ],
  '不動産': [
    { key: 'steel', name: '鉄鋼', unit: '$/t', basePrice: 680, volatility: 20 },
    { key: 'cement', name: 'セメント', unit: '円/t', basePrice: 12500, volatility: 500 },
    { key: 'lumber', name: '木材', unit: '$/1000BF', basePrice: 520, volatility: 30 },
    { key: 'glass', name: '板ガラス', unit: '円/㎡', basePrice: 2800, volatility: 150 },
  ],
  // IT・ソフトウェア
  'IT': [
    { key: 'semiconductor', name: '半導体指数', unit: 'pt', basePrice: 4200, volatility: 80 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
    { key: 'rare_earth', name: 'レアアース', unit: '$/kg', basePrice: 85, volatility: 8 },
    { key: 'lithium', name: 'リチウム', unit: '$/t', basePrice: 15200, volatility: 800 },
  ],
  // 小売・卸売
  '小売業': [
    { key: 'oil', name: '原油(WTI)', unit: '$/バレル', basePrice: 72.5, volatility: 2 },
    { key: 'packaging', name: '包装資材', unit: '円/kg', basePrice: 180, volatility: 10 },
    { key: 'paper', name: '段ボール原紙', unit: '円/t', basePrice: 85000, volatility: 3000 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
  ],
  '卸売業': [
    { key: 'oil', name: '原油(WTI)', unit: '$/バレル', basePrice: 72.5, volatility: 2 },
    { key: 'shipping', name: '海上運賃指数', unit: 'pt', basePrice: 1850, volatility: 120 },
    { key: 'packaging', name: '包装資材', unit: '円/kg', basePrice: 180, volatility: 10 },
    { key: 'paper', name: '段ボール原紙', unit: '円/t', basePrice: 85000, volatility: 3000 },
  ],
  // コンサルティング業（専門職としての原材料）
  'コンサルティング業': [
    { key: 'software', name: 'ソフトウェアライセンス', unit: '円/月', basePrice: 85000, volatility: 5000 },
    { key: 'cloud', name: 'クラウドサービス', unit: '円/月', basePrice: 120000, volatility: 8000 },
    { key: 'data', name: 'データ分析ツール', unit: '円/月', basePrice: 95000, volatility: 6000 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
  ],
  // サービス業
  'サービス業': [
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
    { key: 'gas', name: '都市ガス', unit: '円/㎥', basePrice: 145, volatility: 8 },
    { key: 'paper', name: 'コピー用紙', unit: '円/箱', basePrice: 3200, volatility: 150 },
    { key: 'oil', name: 'ガソリン', unit: '円/L', basePrice: 175, volatility: 5 },
  ],
  // 運輸・物流
  '運輸業': [
    { key: 'oil', name: '軽油', unit: '円/L', basePrice: 155, volatility: 5 },
    { key: 'gasoline', name: 'ガソリン', unit: '円/L', basePrice: 175, volatility: 5 },
    { key: 'shipping', name: '海上運賃指数', unit: 'pt', basePrice: 1850, volatility: 120 },
    { key: 'tire', name: 'タイヤ(天然ゴム)', unit: '¢/kg', basePrice: 165, volatility: 12 },
  ],
  // 医療・介護
  '医療': [
    { key: 'medical_supplies', name: '医療消耗品', unit: '指数', basePrice: 105, volatility: 3 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
    { key: 'plastic', name: '医療用プラスチック', unit: '円/kg', basePrice: 320, volatility: 18 },
    { key: 'paper', name: '衛生用紙', unit: '円/kg', basePrice: 280, volatility: 15 },
  ],
  // デフォルト
  'default': [
    { key: 'oil', name: '原油(WTI)', unit: '$/バレル', basePrice: 72.5, volatility: 2 },
    { key: 'steel', name: '鉄鋼', unit: '$/t', basePrice: 680, volatility: 20 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
    { key: 'shipping', name: '海上運賃指数', unit: 'pt', basePrice: 1850, volatility: 120 },
  ],
}

// 企業の業種から関連原材料を取得（業態・サービス内容を考慮）
function getRelevantMaterials(industry: string, businessDesc: string) {
  // 業種キーワードマッチング
  const industryLower = (industry || '').toLowerCase()
  const descLower = (businessDesc || '').toLowerCase()
  const searchText = `${industryLower} ${descLower}`
  
  // コンサルティング業を優先判定（業態・サービス内容を考慮）
  const consultingKeywords = ['コンサル', 'アドバイザリー', '戦略', '経営支援', 'マネジメント', 'dxコンサル', 'itコンサル', '業務改善', '組織開発', '人事コンサル']
  for (const keyword of consultingKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ コンサルティング業の原材料を選択: キーワード "${keyword}" に一致`)
      return industryMaterials['コンサルティング業']
    }
  }
  
  // キーワードベースで業種を特定
  if (industryLower.includes('食品') || descLower.includes('食品') || descLower.includes('食材')) {
    return industryMaterials['食品']
  }
  if (industryLower.includes('飲料') || descLower.includes('飲料') || descLower.includes('ドリンク')) {
    return industryMaterials['飲料']
  }
  if (industryLower.includes('建設') || industryLower.includes('建築') || descLower.includes('建設')) {
    return industryMaterials['建設業']
  }
  if (industryLower.includes('不動産') || descLower.includes('不動産')) {
    return industryMaterials['不動産']
  }
  if (industryLower.includes('it') || industryLower.includes('ソフトウェア') || industryLower.includes('システム') || descLower.includes('システム開発')) {
    return industryMaterials['IT']
  }
  if (industryLower.includes('小売') || descLower.includes('小売') || descLower.includes('販売店')) {
    return industryMaterials['小売業']
  }
  if (industryLower.includes('卸売') || descLower.includes('卸売') || descLower.includes('商社')) {
    return industryMaterials['卸売業']
  }
  if (industryLower.includes('サービス') || descLower.includes('サービス')) {
    return industryMaterials['サービス業']
  }
  if (industryLower.includes('運輸') || industryLower.includes('物流') || descLower.includes('運送') || descLower.includes('物流')) {
    return industryMaterials['運輸業']
  }
  if (industryLower.includes('医療') || industryLower.includes('介護') || descLower.includes('医療') || descLower.includes('病院')) {
    return industryMaterials['医療']
  }
  if (industryLower.includes('製造') || descLower.includes('製造') || descLower.includes('工場')) {
    return industryMaterials['製造業']
  }
  
  return industryMaterials['default']
}

// 原材料価格を生成
function generateCommodityPrices(materials: typeof industryMaterials['default'], currentRate: number) {
  return materials.map(m => ({
    key: m.key,
    name: m.name,
    unit: m.unit,
    price: Math.round((m.basePrice + (Math.random() - 0.5) * m.volatility * 2) * 100) / 100,
    priceJpy: m.unit.includes('円') ? Math.round(m.basePrice + (Math.random() - 0.5) * m.volatility * 2) : Math.round((m.basePrice + (Math.random() - 0.5) * m.volatility * 2) * currentRate),
    change: Math.round((Math.random() - 0.3) * 4 * 10) / 10,
    isJpy: m.unit.includes('円')
  }))
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

    // 会社情報を取得（業種特定用）
    let companyIndustry = ''
    let companyBusinessDesc = ''
    if (companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('industry, business_description')
        .eq('id', companyId)
        .single()
      companyIndustry = company?.industry || ''
      companyBusinessDesc = company?.business_description || ''
    }

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

    // ログイン日を取得
    const loginDate = new Date()
    const baseMarketData = await getMarketData(loginDate)

    // 企業の業種に応じた原材料を取得
    const relevantMaterials = getRelevantMaterials(companyIndustry, companyBusinessDesc)
    const commodities = generateCommodityPrices(relevantMaterials, baseMarketData.currentRate)

    const marketData = {
      ...baseMarketData,
      commodities,
      industry: companyIndustry || 'default'
    }

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

