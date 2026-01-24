import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getForexRate, getNikkeiProxy, generateWeeklyData } from '@/lib/alphavantage'
import { braveWebSearch } from '@/lib/brave-search'

export const runtime = "nodejs"

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

// 業種別の関連原材料マッピング（業態・商品・サービスを考慮した詳細版）
const industryMaterials: Record<string, { key: string; name: string; unit: string; basePrice: number; volatility: number }[]> = {
  // 製造業
  '製造業': [
    { key: 'steel', name: '鉄鋼', unit: '$/t', basePrice: 680, volatility: 20 },
    { key: 'aluminum', name: 'アルミ', unit: '$/t', basePrice: 2340, volatility: 50 },
    { key: 'copper', name: '銅', unit: '$/t', basePrice: 8950, volatility: 100 },
    { key: 'oil', name: '原油(WTI)', unit: '$/バレル', basePrice: 72.5, volatility: 2 },
  ],
  // 食品製造・加工
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
  // 飲食業（レストラン・カフェ・居酒屋等）
  '飲食業': [
    { key: 'rice', name: '米', unit: '円/kg', basePrice: 450, volatility: 25 },
    { key: 'meat', name: '食肉(豚)', unit: '円/kg', basePrice: 780, volatility: 40 },
    { key: 'vegetables', name: '野菜指数', unit: '指数', basePrice: 105, volatility: 8 },
    { key: 'gas', name: '都市ガス', unit: '円/㎥', basePrice: 145, volatility: 8 },
  ],
  // カフェ・喫茶店
  'カフェ': [
    { key: 'coffee', name: 'コーヒー豆', unit: '¢/ポンド', basePrice: 185, volatility: 8 },
    { key: 'dairy', name: '乳製品(牛乳)', unit: '円/L', basePrice: 180, volatility: 12 },
    { key: 'sugar', name: '砂糖', unit: '円/kg', basePrice: 220, volatility: 15 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
  ],
  // ラーメン・麺類専門店
  'ラーメン店': [
    { key: 'wheat', name: '小麦(製麺用)', unit: '円/kg', basePrice: 95, volatility: 8 },
    { key: 'pork', name: '豚肉(チャーシュー)', unit: '円/kg', basePrice: 650, volatility: 35 },
    { key: 'soy_sauce', name: '醤油', unit: '円/L', basePrice: 320, volatility: 15 },
    { key: 'gas', name: '都市ガス', unit: '円/㎥', basePrice: 145, volatility: 8 },
  ],
  // 居酒屋・バー
  '居酒屋': [
    { key: 'alcohol', name: '酒類(ビール)', unit: '円/L', basePrice: 350, volatility: 20 },
    { key: 'seafood', name: '水産物', unit: '円/kg', basePrice: 1200, volatility: 80 },
    { key: 'vegetables', name: '野菜指数', unit: '指数', basePrice: 105, volatility: 8 },
    { key: 'gas', name: '都市ガス', unit: '円/㎥', basePrice: 145, volatility: 8 },
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
  // アパレル・ファッション
  'アパレル': [
    { key: 'cotton', name: '綿花', unit: '¢/ポンド', basePrice: 85, volatility: 5 },
    { key: 'polyester', name: 'ポリエステル', unit: '$/t', basePrice: 1250, volatility: 80 },
    { key: 'leather', name: '皮革', unit: '$/㎡', basePrice: 45, volatility: 4 },
    { key: 'shipping', name: '海上運賃指数', unit: 'pt', basePrice: 1850, volatility: 120 },
  ],
  // 美容・理容
  '美容業': [
    { key: 'chemicals', name: 'カラー剤', unit: '円/本', basePrice: 850, volatility: 50 },
    { key: 'shampoo', name: 'シャンプー原料', unit: '円/L', basePrice: 320, volatility: 20 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
    { key: 'water', name: '水道', unit: '円/㎥', basePrice: 180, volatility: 10 },
  ],
  // 農業
  '農業': [
    { key: 'fertilizer', name: '肥料', unit: '円/kg', basePrice: 85, volatility: 8 },
    { key: 'pesticide', name: '農薬', unit: '円/L', basePrice: 2800, volatility: 150 },
    { key: 'seed', name: '種苗', unit: '円/kg', basePrice: 1500, volatility: 100 },
    { key: 'oil', name: '軽油', unit: '円/L', basePrice: 155, volatility: 5 },
  ],
  // 宿泊業（ホテル・旅館）
  '宿泊業': [
    { key: 'linen', name: 'リネン類', unit: '円/枚', basePrice: 450, volatility: 30 },
    { key: 'amenity', name: 'アメニティ', unit: '円/セット', basePrice: 120, volatility: 10 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
    { key: 'gas', name: '都市ガス', unit: '円/㎥', basePrice: 145, volatility: 8 },
  ],
  // コンサルティング業（専門職としての原材料）
  'コンサルティング業': [
    { key: 'software', name: 'ソフトウェアライセンス', unit: '円/月', basePrice: 85000, volatility: 5000 },
    { key: 'cloud', name: 'クラウドサービス', unit: '円/月', basePrice: 120000, volatility: 8000 },
    { key: 'data', name: 'データ分析ツール', unit: '円/月', basePrice: 95000, volatility: 6000 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
  ],
  // サービス業（一般）
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
  // 介護
  '介護': [
    { key: 'medical_supplies', name: '介護消耗品', unit: '指数', basePrice: 102, volatility: 3 },
    { key: 'diaper', name: 'おむつ類', unit: '円/枚', basePrice: 45, volatility: 3 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
    { key: 'food', name: '介護食材', unit: '円/食', basePrice: 280, volatility: 15 },
  ],
  // 印刷・出版
  '印刷業': [
    { key: 'paper', name: '印刷用紙', unit: '円/t', basePrice: 95000, volatility: 4000 },
    { key: 'ink', name: '印刷インキ', unit: '円/kg', basePrice: 850, volatility: 50 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
    { key: 'oil', name: '石油溶剤', unit: '円/L', basePrice: 180, volatility: 10 },
  ],
  // 葬祭業・葬儀業（葬儀会館、セレモニーホール等）
  '葬祭業': [
    { key: 'flowers', name: '生花（葬儀用）', unit: '円/式', basePrice: 45000, volatility: 5000 },
    { key: 'coffin', name: '棺（桐材）', unit: '円/基', basePrice: 85000, volatility: 8000 },
    { key: 'dry_ice', name: 'ドライアイス', unit: '円/kg', basePrice: 350, volatility: 30 },
    { key: 'electricity', name: '電力（会館）', unit: '円/kWh', basePrice: 28, volatility: 2 },
  ],
  // デフォルト
  'default': [
    { key: 'oil', name: '原油(WTI)', unit: '$/バレル', basePrice: 72.5, volatility: 2 },
    { key: 'steel', name: '鉄鋼', unit: '$/t', basePrice: 680, volatility: 20 },
    { key: 'electricity', name: '電力', unit: '円/kWh', basePrice: 28, volatility: 2 },
    { key: 'shipping', name: '海上運賃指数', unit: 'pt', basePrice: 1850, volatility: 120 },
  ],
}

// 企業の業種から関連原材料を取得（業態・サービス内容・商品・retrieved_infoを詳細に考慮）
function getRelevantMaterials(industry: string, businessDesc: string, retrievedInfo?: any): { materials: typeof industryMaterials['default']; matchedCategory: string } {
  const industryLower = (industry || '').toLowerCase()
  const descLower = (businessDesc || '').toLowerCase()

  // retrieved_infoから追加情報を抽出
  let retrievedText = ''
  if (retrievedInfo) {
    // 事業内容・サービス・製品情報を抽出
    const relevantKeys = ['business', 'services', 'products', 'description', 'overview', 'mainBusiness', 'companyProfile']
    for (const key of relevantKeys) {
      if (retrievedInfo[key]) {
        retrievedText += ` ${JSON.stringify(retrievedInfo[key])}`
      }
    }
    console.log('📋 retrieved_infoから抽出した追加情報:', retrievedText.substring(0, 200))
  }

  const searchText = `${industryLower} ${descLower} ${retrievedText.toLowerCase()}`

  // 具体的な業態を優先判定（より詳細なマッチング）

  // ラーメン・麺類専門店
  const ramenKeywords = ['ラーメン', 'らーめん', '麺', 'うどん', 'そば', '蕎麦', 'つけ麺']
  for (const keyword of ramenKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ ラーメン店の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['ラーメン店'], matchedCategory: 'ラーメン店' }
    }
  }

  // カフェ・喫茶店
  const cafeKeywords = ['カフェ', 'cafe', '喫茶', 'コーヒー', 'coffee', 'スターバックス', 'ドトール']
  for (const keyword of cafeKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ カフェの原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['カフェ'], matchedCategory: 'カフェ' }
    }
  }

  // 居酒屋・バー
  const izakayaKeywords = ['居酒屋', 'バー', 'bar', '酒場', '飲み屋', 'スナック', 'パブ']
  for (const keyword of izakayaKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ 居酒屋の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['居酒屋'], matchedCategory: '居酒屋' }
    }
  }

  // 飲食業（レストラン・食堂等）
  const restaurantKeywords = ['レストラン', 'restaurant', '食堂', '定食', '弁当', '惣菜', '料理店', '飲食']
  for (const keyword of restaurantKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ 飲食業の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['飲食業'], matchedCategory: '飲食業' }
    }
  }

  // 美容・理容
  const beautyKeywords = ['美容', '理容', 'ヘアサロン', '美容室', '床屋', 'エステ', 'ネイル', 'まつエク']
  for (const keyword of beautyKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ 美容業の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['美容業'], matchedCategory: '美容業' }
    }
  }

  // 宿泊業（ホテル・旅館）
  const hotelKeywords = ['ホテル', 'hotel', '旅館', '民宿', 'ゲストハウス', '宿泊']
  for (const keyword of hotelKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ 宿泊業の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['宿泊業'], matchedCategory: '宿泊業' }
    }
  }

  // アパレル・ファッション
  const apparelKeywords = ['アパレル', 'apparel', 'ファッション', '衣料', '服', '洋服', 'アクセサリー', 'ブランド', '靴', 'バッグ']
  for (const keyword of apparelKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ アパレルの原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['アパレル'], matchedCategory: 'アパレル' }
    }
  }

  // 農業
  const agricultureKeywords = ['農業', '農家', '農園', '畜産', '酪農', '養鶏', '園芸', '野菜', '果物', '米作']
  for (const keyword of agricultureKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ 農業の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['農業'], matchedCategory: '農業' }
    }
  }

  // 介護
  const careKeywords = ['介護', 'デイサービス', '老人ホーム', '福祉', '訪問介護', 'ケアマネ']
  for (const keyword of careKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ 介護の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['介護'], matchedCategory: '介護' }
    }
  }

  // 葬祭業・葬儀業（葬儀会館、セレモニーホール等）
  const funeralKeywords = ['葬儀', '葬祭', '葬式', 'セレモニー', '告別式', '家族葬', '直葬', '火葬', '霊柩', '斎場', '葬儀会館', 'ティア']
  for (const keyword of funeralKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ 葬祭業の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['葬祭業'], matchedCategory: '葬祭業' }
    }
  }

  // 印刷業
  const printKeywords = ['印刷', 'プリント', '出版', '製本', 'デザイン印刷']
  for (const keyword of printKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ 印刷業の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['印刷業'], matchedCategory: '印刷業' }
    }
  }

  // コンサルティング業
  const consultingKeywords = ['コンサル', 'アドバイザリー', '戦略', '経営支援', 'マネジメント', 'dxコンサル', 'itコンサル', '業務改善', '組織開発', '人事コンサル']
  for (const keyword of consultingKeywords) {
    if (searchText.includes(keyword)) {
      console.log(`✅ コンサルティング業の原材料を選択: キーワード "${keyword}" に一致`)
      return { materials: industryMaterials['コンサルティング業'], matchedCategory: 'コンサルティング業' }
    }
  }

  // IT・ソフトウェア
  if (industryLower.includes('it') || industryLower.includes('ソフトウェア') || industryLower.includes('システム') ||
      descLower.includes('システム開発') || descLower.includes('アプリ') || descLower.includes('web') || descLower.includes('クラウド')) {
    console.log('✅ ITの原材料を選択')
    return { materials: industryMaterials['IT'], matchedCategory: 'IT' }
  }

  // 食品製造・加工
  if (industryLower.includes('食品') || descLower.includes('食品') || descLower.includes('食材') || descLower.includes('加工食品')) {
    console.log('✅ 食品の原材料を選択')
    return { materials: industryMaterials['食品'], matchedCategory: '食品' }
  }

  // 飲料
  if (industryLower.includes('飲料') || descLower.includes('飲料') || descLower.includes('ドリンク') || descLower.includes('ジュース')) {
    console.log('✅ 飲料の原材料を選択')
    return { materials: industryMaterials['飲料'], matchedCategory: '飲料' }
  }

  // 建設業
  if (industryLower.includes('建設') || industryLower.includes('建築') || descLower.includes('建設') || descLower.includes('施工') || descLower.includes('土木')) {
    console.log('✅ 建設業の原材料を選択')
    return { materials: industryMaterials['建設業'], matchedCategory: '建設業' }
  }

  // 不動産
  if (industryLower.includes('不動産') || descLower.includes('不動産') || descLower.includes('賃貸') || descLower.includes('マンション')) {
    console.log('✅ 不動産の原材料を選択')
    return { materials: industryMaterials['不動産'], matchedCategory: '不動産' }
  }

  // 小売業
  if (industryLower.includes('小売') || descLower.includes('小売') || descLower.includes('販売店') || descLower.includes('ショップ') || descLower.includes('店舗')) {
    console.log('✅ 小売業の原材料を選択')
    return { materials: industryMaterials['小売業'], matchedCategory: '小売業' }
  }

  // 卸売業
  if (industryLower.includes('卸売') || descLower.includes('卸売') || descLower.includes('商社') || descLower.includes('問屋')) {
    console.log('✅ 卸売業の原材料を選択')
    return { materials: industryMaterials['卸売業'], matchedCategory: '卸売業' }
  }

  // 運輸・物流
  if (industryLower.includes('運輸') || industryLower.includes('物流') || descLower.includes('運送') || descLower.includes('物流') || descLower.includes('配送') || descLower.includes('トラック')) {
    console.log('✅ 運輸業の原材料を選択')
    return { materials: industryMaterials['運輸業'], matchedCategory: '運輸業' }
  }

  // 医療
  if (industryLower.includes('医療') || descLower.includes('医療') || descLower.includes('病院') || descLower.includes('クリニック') || descLower.includes('診療所')) {
    console.log('✅ 医療の原材料を選択')
    return { materials: industryMaterials['医療'], matchedCategory: '医療' }
  }

  // 製造業
  if (industryLower.includes('製造') || descLower.includes('製造') || descLower.includes('工場') || descLower.includes('メーカー')) {
    console.log('✅ 製造業の原材料を選択')
    return { materials: industryMaterials['製造業'], matchedCategory: '製造業' }
  }

  // サービス業（最後にチェック - 汎用カテゴリ）
  if (industryLower.includes('サービス') || descLower.includes('サービス')) {
    console.log('✅ サービス業の原材料を選択')
    return { materials: industryMaterials['サービス業'], matchedCategory: 'サービス業' }
  }

  console.log('⚠️ 業種特定できず、デフォルトの原材料を選択')
  return { materials: industryMaterials['default'], matchedCategory: 'default' }
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

    // 会社情報を取得（業種特定用）- retrieved_infoも含める
    let companyIndustry = ''
    let companyBusinessDesc = ''
    let companyRetrievedInfo: any = null
    if (companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('industry, business_description, retrieved_info, name')
        .eq('id', companyId)
        .single()
      companyIndustry = company?.industry || ''
      companyBusinessDesc = company?.business_description || ''
      companyRetrievedInfo = company?.retrieved_info || null

      // デバッグログ: 会社情報を出力
      console.log('🏢 会社情報（原材料マッチング用）:', {
        name: company?.name,
        industry: companyIndustry,
        business_description: companyBusinessDesc?.substring(0, 100),
        retrieved_info_keys: companyRetrievedInfo ? Object.keys(companyRetrievedInfo) : null
      })
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

    // 企業の業種・業態・商品に応じた原材料を取得（retrieved_infoも考慮）
    const { materials: relevantMaterials, matchedCategory } = getRelevantMaterials(companyIndustry, companyBusinessDesc, companyRetrievedInfo)
    console.log('🏭 マッチした業種カテゴリ:', matchedCategory, '→ 原材料:', relevantMaterials.map(m => m.name).join(', '))
    const commodities = generateCommodityPrices(relevantMaterials, baseMarketData.currentRate)

    const marketData = {
      ...baseMarketData,
      commodities,
      industry: matchedCategory // マッチした業種カテゴリを表示
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

