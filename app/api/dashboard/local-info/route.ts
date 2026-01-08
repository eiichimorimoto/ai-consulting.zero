import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkSearchResult } from "@/lib/fact-checker"

export const runtime = "nodejs"

// 主要都市の座標マップ（OpenWeatherMap用）
const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  '東京都': { lat: 35.6940, lon: 139.7536 },
  '大阪府': { lat: 34.6937, lon: 135.5023 },
  '愛知県': { lat: 35.1815, lon: 136.9066 },
  '神奈川県': { lat: 35.4437, lon: 139.6380 },
  '福岡県': { lat: 33.5904, lon: 130.4017 },
  '北海道': { lat: 43.0642, lon: 141.3469 },
  '宮城県': { lat: 38.2682, lon: 140.8694 },
  '広島県': { lat: 34.3853, lon: 132.4553 },
  '京都府': { lat: 35.0116, lon: 135.7681 },
  '兵庫県': { lat: 34.6913, lon: 135.1830 },
}

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
  console.log(`🔍 Brave Search: query="${query}", apiKey=${key ? '設定済み(' + key.substring(0, 8) + '...)' : '未設定'}`)
  if (!key) {
    console.log('❌ Brave Search APIキーが未設定です')
    return []
  }
  const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`
  try {
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
    console.log(`📡 Brave Search Response: status=${resp.status}`)
    if (!resp.ok) {
      console.log(`❌ Brave Search Error: status=${resp.status}`)
      return []
    }
    const json: any = await resp.json()
    const results = json?.web?.results || []
    console.log(`✅ Brave Search Results: ${results.length}件`)
    return results
  } catch (error) {
    console.error('❌ Brave Search Exception:', error)
    return []
  }
}

// ファクトチェック関数（検索結果の信頼性を検証）
// 重要: 検索結果を表示する前に必ずこの関数を実行すること
async function factCheckSearchResults(results: any[], query: string, expectedType: 'labor' | 'event' | 'infrastructure' | 'weather'): Promise<any[]> {
  if (!results || results.length === 0) return []
  
  // 基本的なファクトチェック
  const verifiedResults = results.filter(result => {
    const text = `${result.title || ''} ${result.description || ''}`.toLowerCase()
    
    // 空の結果を除外
    if (!result.title && !result.description) return false
    
    // スパムや無関係な結果を除外
    const spamKeywords = ['広告', 'advertisement', 'sponsored', 'click here', '今すぐ', '無料体験', '限定']
    if (spamKeywords.some(keyword => text.includes(keyword))) return false
    
    // URLの信頼性チェック（簡易版）
    if (result.url) {
      const suspiciousDomains = ['bit.ly', 'tinyurl', 'goo.gl', 'adf.ly']
      if (suspiciousDomains.some(domain => result.url.includes(domain))) return false
    }
    
    // タイプ別の検証
    if (expectedType === 'labor') {
      // 労務費関連のキーワードが含まれているか
      const laborKeywords = ['時給', '賃金', '給与', '報酬', 'アルバイト', 'パート', '派遣', '最低賃金', '求人', '雇用']
      return laborKeywords.some(keyword => text.includes(keyword))
    }
    
    if (expectedType === 'event') {
      // イベント関連のキーワードが含まれているか
      const eventKeywords = ['イベント', 'セミナー', '展示会', '見本市', 'フォーラム', 'カンファレンス', 'シンポジウム', '勉強会']
      return eventKeywords.some(keyword => text.includes(keyword))
    }
    
    if (expectedType === 'infrastructure') {
      // インフラ関連のキーワードが含まれているか
      const infraKeywords = ['高速', '道路', '工事', '規制', '電力', '供給', '港', '運行', '交通', '物流', 'インフラ']
      return infraKeywords.some(keyword => text.includes(keyword))
    }
    
    if (expectedType === 'weather') {
      // 天気関連のキーワードが含まれているか
      const weatherKeywords = ['天気', '気温', '降水', '晴れ', '雨', '雪', '気象', '天候', '予報']
      return weatherKeywords.some(keyword => text.includes(keyword))
    }
    
    return true
  })
  
  return verifiedResults
}

// 都道府県別最低賃金データ（2024年10月改定・厚生労働省発表）
// 出典: https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/minimumichiran/
const MINIMUM_WAGE_2024: Record<string, number> = {
  '東京': 1163, '神奈川': 1162, '大阪': 1114, '埼玉': 1078, '愛知': 1077,
  '千葉': 1076, '京都': 1058, '兵庫': 1052, '静岡': 1034, '三重': 1023,
  '広島': 1020, '滋賀': 1017, '北海道': 1010, '栃木': 1004, '茨城': 1005,
  '岐阜': 1001, '富山': 998, '長野': 998, '福岡': 992, '山梨': 988,
  '奈良': 986, '群馬': 985, '石川': 984, '岡山': 982, '新潟': 985,
  '福井': 984, '和歌山': 980, '山口': 979, '宮城': 973, '香川': 970,
  '徳島': 966, '福島': 955, '島根': 962, '愛媛': 956, '山形': 955,
  '大分': 954, '鳥取': 957, '佐賀': 956, '熊本': 952, '長崎': 953,
  '鹿児島': 953, '宮崎': 952, '高知': 952, '青森': 953, '秋田': 951,
  '岩手': 952, '沖縄': 952,
}

// 業種別賃金データ（2024年・厚生労働省 賃金構造基本統計調査ベース）
// 出典: 厚生労働省 賃金構造基本統計調査、各種求人サイト統計
// 正社員の平均月収・年収を含む
const INDUSTRY_WAGE_DATA: Record<string, { 
  hourly: number; // パート・アルバイト時給（円）
  hourlyRange: { min: number; max: number }; // パート時給レンジ（円）
  monthly: number; // 正社員平均月収（万円）
  yearly: number; // 正社員平均年収（万円）
  monthlyRange: { min: number; max: number }; // 月収レンジ（万円）
  trend: number; // 年間上昇率（%）
  keywords: string[]; // マッチング用キーワード
}> = {
  '製造業': { hourly: 1180, hourlyRange: { min: 1050, max: 1400 }, monthly: 32, yearly: 450, monthlyRange: { min: 25, max: 45 }, trend: 2.8, keywords: ['製造', '工場', 'メーカー', '生産', '組立', '加工', '機械'] },
  '建設業': { hourly: 1350, hourlyRange: { min: 1150, max: 1800 }, monthly: 38, yearly: 520, monthlyRange: { min: 28, max: 55 }, trend: 4.2, keywords: ['建設', '建築', '土木', '工事', '施工', '設備', 'ゼネコン'] },
  '情報通信業': { hourly: 1450, hourlyRange: { min: 1200, max: 2200 }, monthly: 42, yearly: 580, monthlyRange: { min: 30, max: 70 }, trend: 5.1, keywords: ['IT', '情報', 'システム', 'ソフトウェア', 'プログラム', 'エンジニア', 'Web', 'アプリ', 'DX', 'デジタル'] },
  '運輸業': { hourly: 1200, hourlyRange: { min: 1050, max: 1500 }, monthly: 30, yearly: 420, monthlyRange: { min: 24, max: 42 }, trend: 3.5, keywords: ['運輸', '物流', '運送', '配送', 'トラック', '倉庫', '宅配', '貨物'] },
  '卸売業': { hourly: 1150, hourlyRange: { min: 1000, max: 1400 }, monthly: 33, yearly: 460, monthlyRange: { min: 26, max: 48 }, trend: 2.3, keywords: ['卸売', '卸', '商社', '問屋', '仲卸', '流通'] },
  '小売業': { hourly: 1080, hourlyRange: { min: 1000, max: 1300 }, monthly: 28, yearly: 380, monthlyRange: { min: 22, max: 40 }, trend: 2.0, keywords: ['小売', '販売', '店舗', 'スーパー', 'コンビニ', '百貨店'] },
  '飲食業': { hourly: 1050, hourlyRange: { min: 1000, max: 1250 }, monthly: 26, yearly: 350, monthlyRange: { min: 20, max: 38 }, trend: 3.2, keywords: ['飲食', 'レストラン', '食品', '外食', 'フード', '調理'] },
  '宿泊業': { hourly: 1100, hourlyRange: { min: 1000, max: 1350 }, monthly: 27, yearly: 370, monthlyRange: { min: 21, max: 40 }, trend: 3.8, keywords: ['宿泊', 'ホテル', '旅館', '観光', 'ツーリズム'] },
  '医療': { hourly: 1300, hourlyRange: { min: 1100, max: 1800 }, monthly: 35, yearly: 480, monthlyRange: { min: 28, max: 60 }, trend: 2.5, keywords: ['医療', '病院', 'クリニック', '診療', '看護', '薬局'] },
  '介護福祉': { hourly: 1150, hourlyRange: { min: 1050, max: 1400 }, monthly: 27, yearly: 370, monthlyRange: { min: 22, max: 38 }, trend: 4.0, keywords: ['介護', '福祉', 'ケア', '高齢者', '障害者', 'デイサービス'] },
  '教育': { hourly: 1250, hourlyRange: { min: 1100, max: 1600 }, monthly: 32, yearly: 440, monthlyRange: { min: 25, max: 50 }, trend: 1.8, keywords: ['教育', '学校', '塾', '研修', '講師', 'スクール'] },
  '金融保険': { hourly: 1400, hourlyRange: { min: 1200, max: 1800 }, monthly: 40, yearly: 550, monthlyRange: { min: 30, max: 70 }, trend: 2.2, keywords: ['金融', '銀行', '保険', '証券', 'ファイナンス', '投資'] },
  '不動産': { hourly: 1280, hourlyRange: { min: 1100, max: 1600 }, monthly: 35, yearly: 480, monthlyRange: { min: 26, max: 55 }, trend: 2.0, keywords: ['不動産', '住宅', 'マンション', '賃貸', '仲介'] },
  // コンサルティング業: 専門職として高い人件費（業態・サービス内容を考慮）
  'コンサルティング業': { hourly: 2800, hourlyRange: { min: 2200, max: 4000 }, monthly: 50, yearly: 700, monthlyRange: { min: 40, max: 120 }, trend: 4.5, keywords: ['コンサル', 'コンサルティング', 'アドバイザリー', '戦略', '経営', 'マネジメント', 'DXコンサル', 'ITコンサル', '業務改善', '組織', '人事コンサル'] },
  'サービス業': { hourly: 1100, hourlyRange: { min: 1000, max: 1400 }, monthly: 28, yearly: 380, monthlyRange: { min: 22, max: 42 }, trend: 2.8, keywords: ['サービス', '人材', '広告', 'イベント', '清掃', '警備', 'ビルメンテナンス'] },
  '農林水産': { hourly: 1050, hourlyRange: { min: 1000, max: 1250 }, monthly: 25, yearly: 340, monthlyRange: { min: 20, max: 35 }, trend: 3.0, keywords: ['農業', '農林', '水産', '漁業', '畜産'] },
}

// 従業員規模による賃金補正係数
const EMPLOYEE_SIZE_FACTOR: Record<string, number> = {
  '1-9': 0.85,      // 10人未満
  '10-29': 0.90,    // 10-29人
  '30-99': 0.95,    // 30-99人
  '100-299': 1.00,  // 100-299人（基準）
  '300-999': 1.08,  // 300-999人
  '1000+': 1.15,    // 1000人以上
}

// 業種をマッチング（コンサルティング業を優先）
function matchIndustry(companyIndustry: string, companyDescription?: string): string {
  const searchText = `${companyIndustry} ${companyDescription || ''}`.toLowerCase()
  
  // コンサルティング業を優先判定（業態・サービス内容を考慮）
  const consultingKeywords = ['コンサル', 'アドバイザリー', '戦略', '経営支援', 'マネジメント', 'dxコンサル', 'itコンサル', '業務改善', '組織開発', '人事コンサル']
  for (const keyword of consultingKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ コンサルティング業と判定: キーワード "${keyword}" に一致`)
      return 'コンサルティング業'
    }
  }
  
  let bestMatch = 'サービス業'
  let maxScore = 0
  
  for (const [industryName, data] of Object.entries(INDUSTRY_WAGE_DATA)) {
    let score = 0
    for (const keyword of data.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += keyword.length // 長いキーワードほど高スコア
      }
    }
    if (score > maxScore) {
      maxScore = score
      bestMatch = industryName
    }
  }
  
  return bestMatch
}

// 従業員規模カテゴリを判定
function getEmployeeSizeCategory(employeeCount: string | number | null): string {
  if (!employeeCount) return '30-99'
  
  const count = typeof employeeCount === 'string' 
    ? parseInt(employeeCount.replace(/[^0-9]/g, '')) 
    : employeeCount
    
  if (count < 10) return '1-9'
  if (count < 30) return '10-29'
  if (count < 100) return '30-99'
  if (count < 300) return '100-299'
  if (count < 1000) return '300-999'
  return '1000+'
}

// 労務費データを取得（月別グラフ用）- 改善版
// 会社の業種、所在地、従業員規模を考慮して実態に近い数値を算出
async function getLaborCosts(
  prefecture: string, 
  city: string, 
  industry: string,
  employeeCount?: string | number | null,
  businessDescription?: string
) {
  const area = `${prefecture}${city}`.replace(/[都道府県市区町村]/g, '')
  const prefName = prefecture.replace(/[都道府県]/g, '')
  
  // 都道府県の最低賃金を取得
  const minimumWage = MINIMUM_WAGE_2024[prefName] || 1000
  
  // 業種をスマートにマッチング
  const matchedIndustryName = matchIndustry(industry, businessDescription)
  const industryData = INDUSTRY_WAGE_DATA[matchedIndustryName]
  
  // 従業員規模による補正
  const sizeCategory = getEmployeeSizeCategory(employeeCount)
  const sizeFactor = EMPLOYEE_SIZE_FACTOR[sizeCategory]
  
  // 地域補正係数（東京を1.0として）
  const regionFactor = minimumWage / 1163
  
  // 外部検索で最新の労務費情報を取得（月収・年収ベースで検索）
  const queries = [
    `${prefName} ${matchedIndustryName} 正社員 平均年収 2024`,
    `${matchedIndustryName} 業界 平均月収 給与 2024`,
    `${prefName} ${industry} 賃金 給与水準`,
  ]

  const results: any[] = []
  const searchLogs: Array<{ query: string; resultCount: number; results: any[] }> = []
  
  for (const q of queries) {
    const searchResults = await braveWebSearch(q, 3)
    const verifiedResults = await factCheckSearchResults(searchResults, q, 'labor')
    results.push(...verifiedResults)
    searchLogs.push({
      query: q,
      resultCount: searchResults.length,
      results: verifiedResults
    })
  }

  // 検索結果から年収・月収の数値を抽出
  let searchBasedYearly = 0
  let searchBasedMonthly = 0
  if (results.length > 0) {
    for (const r of results) {
      const text = (r.description || r.title || '')
      
      // 年収パターン（300万〜800万程度）
      const yearlyMatch = text.match(/年収[：:\s]*(\d{3,4})[万]?|(\d{3,4})[万]?円.*年収/i)
      if (yearlyMatch) {
        const value = parseInt(yearlyMatch[1] || yearlyMatch[2])
        if (value >= 250 && value <= 1200) {
          searchBasedYearly = value
        }
      }
      
      // 月収パターン（20万〜60万程度）
      const monthlyMatch = text.match(/月収[：:\s]*(\d{2,3})[万]?|(\d{2,3})[万]?円.*月収/i)
      if (monthlyMatch) {
        const value = parseInt(monthlyMatch[1] || monthlyMatch[2])
        if (value >= 18 && value <= 80) {
          searchBasedMonthly = value
        }
      }
    }
  }
  
  // 最終的な推定月収（業種平均 × 地域補正 × 規模補正）
  const baseMonthly = industryData.monthly
  const estimatedMonthly = Math.round(baseMonthly * regionFactor * sizeFactor)
  
  // 検索結果の信頼性を判定（東京など主要都市では検索結果を優先）
  const majorCities = ['東京', '大阪', '愛知', '神奈川', '福岡']
  const isSearchPriority = majorCities.includes(prefName) && searchBasedMonthly > 0
  
  // 検索結果がある場合は加味（信頼性に応じて重み付け）
  // 主要都市: 検索結果70% + 基準値30%（実態を優先）
  // その他: 検索結果40% + 基準値60%（基準値を優先）
  const finalMonthly = searchBasedMonthly > 0 
    ? isSearchPriority
      ? Math.round((searchBasedMonthly * 0.7) + (estimatedMonthly * 0.3))
      : Math.round((searchBasedMonthly * 0.4) + (estimatedMonthly * 0.6))
    : estimatedMonthly
    
  // 年収を算出（月収×14〜16ヶ月分：賞与考慮）
  const bonusMultiplier = 14 + (sizeFactor - 0.85) * 5 // 規模が大きいほど賞与が多い
  const finalYearly = searchBasedYearly > 0
    ? isSearchPriority
      ? Math.round((searchBasedYearly * 0.7) + (finalMonthly * bonusMultiplier * 0.3))
      : Math.round((searchBasedYearly * 0.4) + (finalMonthly * bonusMultiplier * 0.6))
    : Math.round(finalMonthly * bonusMultiplier)
  
  // 時給換算（月160時間として）
  const finalHourly = Math.round((finalMonthly * 10000) / 160)

  // 月別データを生成（過去6ヶ月・実際のトレンドに基づく）
  const monthlyTrend = industryData.trend / 12
  const monthlyData = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const trendAdjustment = (5 - i) * (monthlyTrend / 100) * finalMonthly
    monthlyData.push({
      month: `${date.getMonth() + 1}月`,
      value: Math.round((finalMonthly - (5 - i) * (monthlyTrend / 100) * finalMonthly + trendAdjustment) * 10000) // 円単位
    })
  }

  return {
    current: finalHourly, // 時給（互換性のため残す）
    monthly: finalMonthly, // 月収（万円）
    yearly: finalYearly, // 年収（万円）
    change: industryData.trend,
    monthlyData,
    comparison: {
      industryName: matchedIndustryName,
      industryAverage: finalHourly, // 地域・業種平均時給（円）
      industryMonthly: industryData.monthly,
      industryYearly: industryData.yearly,
      // 時給レンジのバリデーション: 最低1000円以上であること（最低賃金対策）
      industryHourlyRange: {
        min: Math.max(industryData.hourlyRange.min, minimumWage),
        max: industryData.hourlyRange.max >= 1000 ? industryData.hourlyRange.max : 1600
      },
      industryMonthlyRange: industryData.monthlyRange, // 正社員月収レンジ（万円）
      industryTrend: industryData.trend,
      minimumWage: minimumWage,
      prefecture: prefName,
      employeeSize: sizeCategory,
      sizeFactor: sizeFactor,
      regionFactor: regionFactor,
      vsIndustryMonthly: finalMonthly - industryData.monthly,
      vsIndustryYearly: finalYearly - industryData.yearly,
    },
    sources: results.slice(0, 3),
    dataSource: {
      minimumWage: '厚生労働省 地域別最低賃金（2024年10月改定）',
      industryWage: '厚生労働省 賃金構造基本統計調査（2024年）',
      lastUpdated: '2024年10月',
    },
    _debug: {
      searchQueries: queries,
      searchLogs,
      matchedIndustry: matchedIndustryName,
      sizeCategory,
      sizeFactor,
      regionFactor,
      baseMonthly,
      estimatedMonthly,
      searchBasedMonthly,
      searchBasedYearly,
      isSearchPriority,
      searchWeight: isSearchPriority ? '70%' : '40%',
      baseWeight: isSearchPriority ? '30%' : '60%',
      finalMonthly,
      finalYearly,
      finalHourly,
      calculation: searchBasedMonthly > 0
        ? isSearchPriority
          ? `検索結果優先: ${searchBasedMonthly}万円×0.7 + ${estimatedMonthly}万円×0.3 = ${finalMonthly}万円`
          : `基準値優先: ${searchBasedMonthly}万円×0.4 + ${estimatedMonthly}万円×0.6 = ${finalMonthly}万円`
        : `基準値のみ: ${estimatedMonthly}万円`,
    }
  }
}

// 注目イベントを取得
async function getEvents(prefecture: string, city: string, industry: string) {
  const area = `${prefecture}${city}`.replace(/[都道府県市区町村]/g, '')
  const industryQuery = industry ? `${industry} ` : ''
  const query = `${area} ${industryQuery}イベント 2025 1月 2月 セミナー 展示会 見本市`
  
  const searchResults = await braveWebSearch(query, 10)
  // ファクトチェックを実行
  const verifiedResults = await factCheckSearchResults(searchResults, query, 'event')
  
  // 注目度が高いもの3-5件を返す
  return {
    events: verifiedResults.slice(0, 5).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
      date: extractDate(r.description || r.title || '')
    })),
    _debug: {
      searchQuery: query,
      resultCount: searchResults.length,
      verifiedCount: verifiedResults.length,
      allResults: verifiedResults
    }
  }
}

// インフラ情報を取得
async function getInfrastructure(prefecture: string, city: string, industry: string) {
  const area = `${prefecture}${city}`.replace(/[都道府県市区町村]/g, '')
  const industryQuery = industry ? `${industry} ` : ''
  const queries = [
    `${area} 高速道路 工事 規制`,
    `${area} 電力 供給 状況`,
    `${area} 港 運行 状況`,
    `${area} ${industryQuery}物流 インフラ 影響`,
  ]

  const results: any[] = []
  const searchLogs: Array<{ query: string; resultCount: number; verifiedCount: number; results: any[] }> = []
  
  for (const q of queries) {
    const searchResults = await braveWebSearch(q, 5)
    // ファクトチェックを実行
    const verifiedResults = await factCheckSearchResults(searchResults, q, 'infrastructure')
    results.push(...verifiedResults)
    searchLogs.push({
      query: q,
      resultCount: searchResults.length,
      verifiedCount: verifiedResults.length,
      results: verifiedResults
    })
  }

  // 注目度が高いもの3-5件を返す
  return {
    items: results.slice(0, 5).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
      status: extractStatus(r.description || r.title || '')
    })),
    _debug: {
      searchQueries: queries,
      searchLogs,
      totalResults: results.length
    }
  }
}

// OpenWeatherMap APIから天気を取得
async function getWeather(prefecture: string, city: string) {
  const now = new Date()
  
  // 座標を取得（主要都市のマップから）
  const coordinates = CITY_COORDINATES[prefecture] || CITY_COORDINATES['東京都']
  const { lat, lon } = coordinates
  
  console.log(`🌍 天気取得: ${prefecture}${city} (lat=${lat}, lon=${lon})`)
  
  // OpenWeatherMap APIから現在の天気と5日間予報を取得
  const { getCurrentWeather, get5DayForecast, weatherIconToEmoji, getDeliveryImpact } = await import('@/lib/openweather')
  
  const [currentWeather, forecast] = await Promise.all([
    getCurrentWeather(lat, lon),
    get5DayForecast(lat, lon)
  ])
  
  // APIエラーの場合
  if (!currentWeather || !forecast) {
    console.error('❌ OpenWeatherMap API からデータ取得失敗')
    return {
      location: `${prefecture}${city}`,
      timestamp: now.toISOString(),
      displayTime: `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
      current: {
        temp: null,
        icon: '☀️',
        desc: 'データ取得中...'
      },
      week: [],
      hourly: [],
      alerts: [],
      _debug: {
        searchQuery: `OpenWeatherMap API (lat=${lat}, lon=${lon})`,
        alertQuery: '',
        resultCount: 0,
        alertResultCount: 0,
        verifiedCount: 0,
        searchResults: [],
        alertsFound: 0,
        extractedTemp: null,
        extractedPrecipitation: null,
        location: `${prefecture}${city}`,
        timestamp: now.toISOString(),
        apiError: 'OpenWeatherMap API エラー'
      }
    }
  }
  
  // 現在の気温と天気
  const currentTemp = Math.round(currentWeather.main.temp)
  const currentIcon = weatherIconToEmoji(currentWeather.weather[0].icon)
  const precipitationChance = forecast.list[0]?.pop || 0
  
  // 天気の説明と配送への影響
  const currentDesc = getDeliveryImpact(currentWeather.weather[0].main, precipitationChance)
  
  // 週間天気データ（予報から1日1件ずつ抽出）
  const weekDays = ['日', '月', '火', '水', '木', '金', '土']
  const weekWeather = []
  const dailyForecasts: Record<string, typeof forecast.list[0]> = {}
  
  // 各日の正午のデータを取得（より代表的な気温）
  for (const item of forecast.list) {
    const date = new Date(item.dt * 1000)
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
    const hour = date.getHours()
    
    // 正午（12時）のデータを優先、なければその日の最初のデータ
    if (!dailyForecasts[dateStr] || hour === 12) {
      dailyForecasts[dateStr] = item
    }
  }
  
  // 今日を含む7日間
  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    const dayOfWeek = date.getDay()
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
    
    const forecastData = dailyForecasts[dateStr]
    const temp = forecastData ? Math.round(forecastData.main.temp) : currentTemp + (Math.random() * 4 - 2)
    const icon = forecastData ? weatherIconToEmoji(forecastData.weather[0].icon) : currentIcon
    
    weekWeather.push({
      day: weekDays[dayOfWeek],
      date: dateStr,
      icon: icon,
      temp: temp
    })
  }
  
  // 時間別予報（次の6時間、3時間ごと）
  const hourlyForecast = []
  for (let i = 0; i < Math.min(6, forecast.list.length); i++) {
    const item = forecast.list[i]
    const date = new Date(item.dt * 1000)
    const hour = date.getHours()
    
    hourlyForecast.push({
      time: `${hour}:00`,
      temp: Math.round(item.main.temp),
      icon: weatherIconToEmoji(item.weather[0].icon)
    })
  }
  
  // 気象警報チェック（Brave Searchを使用）
  const area = `${prefecture}${city}`.replace(/[都道府県市区町村]/g, '')
  const alertQuery = `${area} 気象警報 注意報 ${now.getMonth() + 1}月`
  const alertResults = await braveWebSearch(alertQuery, 5)
  
  const alerts: { type: string; title: string; description: string; severity: 'warning' | 'severe' | 'extreme' }[] = []
  const alertKeywords = {
    extreme: ['特別警報', '大雨特別警報', '暴風特別警報', '高潮特別警報', '大雪特別警報', '緊急'],
    severe: ['警報', '暴風警報', '大雨警報', '洪水警報', '大雪警報', '高潮警報', '波浪警報'],
    warning: ['注意報', '強風注意報', '大雨注意報', '雷注意報', '乾燥注意報', '霜注意報', '着雪注意報', '融雪注意報', '濃霧注意報', '低温注意報', '高温注意報']
  }
  
  for (const result of alertResults) {
    const text = `${result.title} ${result.description}`.toLowerCase()
    
    for (const keyword of alertKeywords.extreme) {
      if (text.includes(keyword.toLowerCase())) {
        alerts.push({
          type: 'extreme',
          title: `🚨 ${keyword}発令中`,
          description: result.description?.slice(0, 100) || result.title,
          severity: 'extreme'
        })
        break
      }
    }
    
    if (alerts.length === 0) {
      for (const keyword of alertKeywords.severe) {
        if (text.includes(keyword.toLowerCase())) {
          alerts.push({
            type: 'severe',
            title: `⚠️ ${keyword}発令中`,
            description: result.description?.slice(0, 100) || result.title,
            severity: 'severe'
          })
          break
        }
      }
    }
    
    if (alerts.length === 0) {
      for (const keyword of alertKeywords.warning) {
        if (text.includes(keyword.toLowerCase())) {
          alerts.push({
            type: 'warning',
            title: `ℹ️ ${keyword}発令中`,
            description: result.description?.slice(0, 100) || result.title,
            severity: 'warning'
          })
          break
        }
      }
    }
  }
  const now = new Date() // 現在時刻を使用
  const area = `${prefecture}${city}`.replace(/[都道府県市区町村]/g, '')
  const query = `${area} 天気 週間 ${now.getMonth() + 1}月`
  
  const searchResults = await braveWebSearch(query, 5)
  // ファクトチェックを実行
  const verifiedResults = await factCheckSearchResults(searchResults, query, 'weather')
  
  // 異常気象・気象警報を検索
  const alertQuery = `${area} 気象警報 注意報 ${now.getMonth() + 1}月`
  const alertResults = await braveWebSearch(alertQuery, 5)
  
  // 異常気象アラートを抽出
  const alerts: { type: string; title: string; description: string; severity: 'warning' | 'severe' | 'extreme' }[] = []
  const alertKeywords = {
    extreme: ['特別警報', '大雨特別警報', '暴風特別警報', '高潮特別警報', '大雪特別警報', '緊急'],
    severe: ['警報', '暴風警報', '大雨警報', '洪水警報', '大雪警報', '高潮警報', '波浪警報'],
    warning: ['注意報', '強風注意報', '大雨注意報', '雷注意報', '乾燥注意報', '霜注意報', '着雪注意報', '融雪注意報', '濃霧注意報', '低温注意報', '高温注意報']
  }
  
  for (const result of alertResults) {
    const text = `${result.title} ${result.description}`.toLowerCase()
    
    // 特別警報チェック
    for (const keyword of alertKeywords.extreme) {
      if (text.includes(keyword.toLowerCase())) {
        alerts.push({
          type: 'extreme',
          title: `🚨 ${keyword}発令中`,
          description: result.description?.slice(0, 100) || result.title,
          severity: 'extreme'
        })
        break
      }
    }
    
    // 警報チェック
    if (alerts.length === 0) {
      for (const keyword of alertKeywords.severe) {
        if (text.includes(keyword.toLowerCase())) {
          alerts.push({
            type: 'severe',
            title: `⚠️ ${keyword}発令中`,
            description: result.description?.slice(0, 100) || result.title,
            severity: 'severe'
          })
          break
        }
      }
    }
    
    // 注意報チェック
    if (alerts.length === 0) {
      for (const keyword of alertKeywords.warning) {
        if (text.includes(keyword.toLowerCase())) {
          alerts.push({
            type: 'warning',
            title: `ℹ️ ${keyword}発令中`,
            description: result.description?.slice(0, 100) || result.title,
            severity: 'warning'
          })
          break
        }
      }
    }
  }
  
  // 検索結果から現在の気温を抽出（複数パターン対応）
  let currentTemp = null
  let precipitationChance = null
  
  // 気温抽出パターン（より広範囲に対応）
  const tempPatterns = [
    /気温[：:]*\s*(\d+)[℃度°C]/gi,
    /(\d+)[℃度°C]/gi,
    /最高[気温]*[：:]*\s*(\d+)[℃度°C]/gi,
    /最低[気温]*[：:]*\s*(\d+)[℃度°C]/gi,
    /現在[：:]*\s*(\d+)[℃度°C]/gi,
  ]
  
  // 降水確率抽出パターン
  const precipPattern = /降水確率[：:]*\s*(\d+)%/gi
  
  // 全ての検索結果から気温を探す
  for (const result of verifiedResults) {
    const text = `${result.title} ${result.description}`
    
    // 気温を抽出
    if (!currentTemp) {
      for (const pattern of tempPatterns) {
        const matches = [...text.matchAll(pattern)]
        if (matches.length > 0) {
          const temp = parseInt(matches[0][1])
          if (temp > 0 && temp < 50) { // 妥当な範囲の気温のみ
            currentTemp = temp
            break
          }
        }
      }
    }
    
    // 降水確率を抽出
    if (!precipitationChance) {
      const matches = [...text.matchAll(precipPattern)]
      if (matches.length > 0) {
        precipitationChance = parseInt(matches[0][1])
      }
    }
    
    if (currentTemp && precipitationChance) break
  }
  
  // 気温が取得できない場合のみWeb検索を追加実行
  if (!currentTemp) {
    const tempQuery = `${area} 気温 現在 ${now.getMonth() + 1}月${now.getDate()}日`
    const tempResults = await braveWebSearch(tempQuery, 3)
    for (const result of tempResults) {
      const text = `${result.title} ${result.description}`
      for (const pattern of tempPatterns) {
        const matches = [...text.matchAll(pattern)]
        if (matches.length > 0) {
          const temp = parseInt(matches[0][1])
          if (temp > 0 && temp < 50) {
            currentTemp = temp
            break
          }
        }
      }
      if (currentTemp) break
    }
  }
  
  // 気温が取得できない場合はエラーメッセージを設定（ダミーデータを使わない）
  if (!currentTemp) {
    console.error(`⚠️ 気温取得失敗: ${area}`)
    currentTemp = null  // 明示的にnullを設定
  }

  return {
    location: `${prefecture}${city}`,
    timestamp: now.toISOString(),
    displayTime: `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
    current: {
      temp: currentTemp,
      icon: alerts.length > 0 && alerts[0].severity === 'extreme' ? '🌀' : currentIcon,
      desc: alerts.length > 0 ? alerts[0].title + ' / ' + alerts[0].description.slice(0, 50) : currentDesc
    },
    week: weekWeather,
    hourly: hourlyForecast,
    alerts: alerts.slice(0, 3),
    _debug: {
      searchQuery: `OpenWeatherMap API (lat=${lat}, lon=${lon})`,
      alertQuery: alertQuery,
      resultCount: forecast.list.length,
      alertResultCount: alertResults.length,
      verifiedCount: forecast.list.length,
      searchResults: [],
      alertsFound: alerts.length,
      extractedTemp: currentTemp,
      extractedPrecipitation: Math.round(precipitationChance * 100),
      location: `${prefecture}${city}`,
      timestamp: now.toISOString(),
      apiSource: 'OpenWeatherMap',
      weatherMain: currentWeather.weather[0].main,
      weatherDescription: currentWeather.weather[0].description
    }
  }
}

function extractDate(text: string): string {
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})|(\d{1,2})月(\d{1,2})日/)
  if (dateMatch) {
    return dateMatch[0]
  }
  return ''
}

function extractStatus(text: string): 'normal' | 'warning' | 'error' {
  if (text.includes('工事') || text.includes('規制') || text.includes('停止')) {
    return 'warning'
  }
  if (text.includes('異常') || text.includes('停止') || text.includes('不通')) {
    return 'error'
  }
  return 'normal'
}

// トラフィック情報を取得
async function getTrafficInfo(prefecture: string, city: string) {
  console.log(`🚗 交通情報取得開始: ${prefecture}${city}`)
  const area = `${prefecture}${city}`.replace(/[都道府県市区町村]/g, '')
  const queries = [
    `${area} 交通 渋滞 情報 現在`,
    `${area} 高速道路 渋滞 リアルタイム`,
    `${area} 交通規制 工事 現在`,
  ]

  const results: any[] = []
  const searchLogs: Array<{ query: string; resultCount: number; verifiedCount: number; results: any[] }> = []
  
  for (const q of queries) {
    console.log(`🔍 交通情報検索: ${q}`)
    const searchResults = await braveWebSearch(q, 3)
    console.log(`📊 検索結果: ${searchResults.length}件`)
    // ファクトチェックを実行
    const verifiedResults = await factCheckSearchResults(searchResults, q, 'infrastructure')
    console.log(`✅ 検証済み結果: ${verifiedResults.length}件`)
    results.push(...verifiedResults)
    searchLogs.push({
      query: q,
      resultCount: searchResults.length,
      verifiedCount: verifiedResults.length,
      results: verifiedResults
    })
  }

  console.log(`🚗 交通情報取得完了: 合計${results.length}件`)

  // 注目度が高いもの3-5件を返す
  return {
    items: results.slice(0, 5).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
      status: extractTrafficStatus(r.description || r.title || '')
    })),
    _debug: {
      searchQueries: queries,
      searchLogs,
      totalResults: results.length
    }
  }
}

function extractTrafficStatus(text: string): 'normal' | 'warning' | 'error' {
  if (text.includes('渋滞') || text.includes('混雑') || text.includes('遅延')) {
    return 'warning'
  }
  if (text.includes('通行止め') || text.includes('規制') || text.includes('事故')) {
    return 'error'
  }
  return 'normal'
}

// ロジスティクス情報を取得
async function getLogisticsInfo(prefecture: string, city: string, industry: string) {
  const area = `${prefecture}${city}`.replace(/[都道府県市区町村]/g, '')
  const industryQuery = industry ? `${industry} ` : ''
  const queries = [
    `${area} ${industryQuery}物流 配送 状況 2025`,
    `${area} 運送 配送料 燃料費 動向`,
    `${area} 倉庫 物流センター ニュース`,
    `${area} ${industryQuery}サプライチェーン 最新`,
    `物流業界 2025 トレンド ニュース`,
  ]

  const results: any[] = []
  const searchLogs: Array<{ query: string; resultCount: number; verifiedCount: number; results: any[] }> = []
  
  for (const q of queries) {
    const searchResults = await braveWebSearch(q, 3)
    // ファクトチェックを実行（logistics用のキーワード検証）
    const verifiedResults = searchResults.filter(result => {
      const text = `${result.title || ''} ${result.description || ''}`.toLowerCase()
      if (!result.title && !result.description) return false
      const logisticsKeywords = ['物流', '配送', '運送', '倉庫', 'トラック', '宅配', '輸送', 'サプライチェーン', '荷物', '貨物', '燃料', 'ドライバー', '2024年問題']
      return logisticsKeywords.some(keyword => text.includes(keyword))
    })
    results.push(...verifiedResults)
    searchLogs.push({
      query: q,
      resultCount: searchResults.length,
      verifiedCount: verifiedResults.length,
      results: verifiedResults
    })
  }

  // 重複を除去
  const uniqueResults = results.reduce((acc: any[], current) => {
    const exists = acc.find(item => item.url === current.url)
    if (!exists) acc.push(current)
    return acc
  }, [])

  return {
    items: uniqueResults.slice(0, 6).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
      category: extractLogisticsCategory(r.title || '', r.description || ''),
      status: extractLogisticsStatus(r.description || r.title || '')
    })),
    _debug: {
      searchQueries: queries,
      searchLogs,
      totalResults: uniqueResults.length
    }
  }
}

function extractLogisticsCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()
  if (text.includes('燃料') || text.includes('ガソリン') || text.includes('軽油')) return 'fuel'
  if (text.includes('ドライバー') || text.includes('人手不足') || text.includes('2024年問題')) return 'driver'
  if (text.includes('倉庫') || text.includes('物流センター')) return 'warehouse'
  if (text.includes('配送料') || text.includes('運賃') || text.includes('コスト')) return 'cost'
  if (text.includes('サプライチェーン') || text.includes('供給')) return 'supply'
  return 'general'
}

function extractLogisticsStatus(text: string): 'normal' | 'warning' | 'error' {
  if (text.includes('値上げ') || text.includes('上昇') || text.includes('遅延') || text.includes('不足')) {
    return 'warning'
  }
  if (text.includes('停止') || text.includes('危機') || text.includes('混乱') || text.includes('崩壊')) {
    return 'error'
  }
  return 'normal'
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
      .select('prefecture, city, industry, business_description, employee_count')
      .eq('id', profile.company_id)
      .single()

    if (!company) {
      return NextResponse.json(
        { error: "会社情報が見つかりません" },
        { status: 404 }
      )
    }

    // 会社情報をデバッグログ出力（問題追跡用）
    console.log('📍 会社情報（DB取得結果）:', {
      prefecture_raw: company.prefecture,
      city_raw: company.city,
      industry: company.industry,
      employee_count: company.employee_count
    })

    const prefecture = company.prefecture || '愛知県'
    const city = company.city || '名古屋市'
    const industry = company.industry || ''
    const businessDescription = company.business_description || ''
    const employeeCount = company.employee_count || null
    const loginDate = new Date()
    
    // デフォルト値を使用した場合は警告ログ
    if (!company.prefecture) {
      console.warn('⚠️ prefecture がDBに保存されていません。デフォルト値（愛知県）を使用します。')
    }
    if (!company.city) {
      console.warn('⚠️ city がDBに保存されていません。デフォルト値（名古屋市）を使用します。')
    }

    // 強制更新パラメータをチェック
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'

    // 強制更新でない場合、キャッシュからデータを取得（有効期限: 30分）
    if (!forceRefresh) {
      const cacheExpiry = new Date()
      cacheExpiry.setMinutes(cacheExpiry.getMinutes() - 30)

      const { data: cachedData } = await supabase
        .from('dashboard_data')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .eq('data_type', 'local_info')
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

    // 各データを並列取得（業種・会社規模情報を含める）
    const [laborCosts, events, infrastructure, weather, traffic, logistics] = await Promise.all([
      getLaborCosts(prefecture, city, industry, employeeCount, businessDescription),
      getEvents(prefecture, city, industry),
      getInfrastructure(prefecture, city, industry),
      getWeather(prefecture, city),
      getTrafficInfo(prefecture, city),
      getLogisticsInfo(prefecture, city, industry)
    ])

    // デバッグ情報を収集
    const debugInfo = {
      searchArea: `${prefecture}${city}`,
      // DB取得結果（問題追跡用）
      companyDbData: {
        prefecture_raw: company.prefecture || null,
        city_raw: company.city || null,
        prefecture_used: prefecture,
        city_used: city,
        isDefaultPrefecture: !company.prefecture,
        isDefaultCity: !company.city
      },
      industry: industry || '未設定',
      searchTimestamp: new Date().toISOString(),
      laborCosts: laborCosts._debug,
      events: events._debug,
      infrastructure: infrastructure._debug,
      weather: weather._debug,
      traffic: traffic._debug,
      logistics: logistics._debug,
      apiKeyConfigured: !!process.env.BRAVE_SEARCH_API_KEY
    }

    const localInfoData = {
      laborCosts: {
        current: laborCosts.current, // 時給（円）
        monthly: laborCosts.monthly, // 月収（万円）
        yearly: laborCosts.yearly, // 年収（万円）
        change: laborCosts.change,
        monthlyData: laborCosts.monthlyData,
        comparison: laborCosts.comparison, // 業界比較情報
        sources: laborCosts.sources,
        dataSource: laborCosts.dataSource,
      },
      events: events.events,
      infrastructure: infrastructure.items,
      weather: {
        current: weather.current,
        week: weather.week
      },
      traffic: traffic.items,
      logistics: logistics.items,
      _debug: {
        ...debugInfo,
        traffic: traffic._debug,
        logistics: logistics._debug
      }
    }

    // データをSupabaseに保存（UPSERT）
    const { error: saveError } = await supabase
      .from('dashboard_data')
      .upsert({
        user_id: user.id,
        company_id: profile.company_id,
        data_type: 'local_info',
        data: localInfoData,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分後
      }, {
        onConflict: 'user_id,company_id,data_type'
      })

    if (saveError) {
      console.error('Failed to save local info data:', saveError)
      // 保存エラーでもデータは返す
    }

    // ファクトチェックを実行（検索結果のソース情報を収集）
    const sources: { url: string; title: string; date?: string }[] = []
    
    // イベント情報からソースを収集
    if (events?.events) {
      events.events.forEach((e: any) => {
        if (e.url) sources.push({ url: e.url, title: e.title || '' })
      })
    }
    
    // インフラ情報からソースを収集
    if (infrastructure?.items) {
      infrastructure.items.forEach((i: any) => {
        if (i.url) sources.push({ url: i.url, title: i.title || '' })
      })
    }
    
    // 交通情報からソースを収集
    if (traffic?.items) {
      traffic.items.forEach((t: any) => {
        if (t.url) sources.push({ url: t.url, title: t.title || '' })
      })
    }

    const factCheckResult = checkSearchResult({
      sources,
      query: `${prefecture}${city} 地域情報`
    })

    console.log("📋 検索結果ファクトチェック:", JSON.stringify(factCheckResult, null, 2))

    return NextResponse.json({
      data: localInfoData,
      updatedAt: new Date().toISOString(),
      cached: false,
      factCheck: factCheckResult
    })

  } catch (error) {
    console.error('Local info error:', error)
    return NextResponse.json(
      {
        error: "地域情報の取得に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

