// Alpha Vantage API ユーティリティ
// 為替・株価データを取得

export interface ForexData {
  symbol: string
  rate: number
  timestamp: string
}

export interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  timestamp: string
}

/**
 * Alpha Vantage APIから為替レートを取得
 * 無料プラン: 500 calls/日, 25 calls/分
 */
export async function getForexRate(fromCurrency: string = 'USD', toCurrency: string = 'JPY'): Promise<ForexData | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim()
  
  if (!apiKey) {
    console.error('❌ ALPHA_VANTAGE_API_KEY が設定されていません')
    return null
  }
  
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${apiKey}`
  
  try {
    console.log(`💱 Alpha Vantage API: 為替レート取得中... (${fromCurrency}/${toCurrency})`)
    const response = await fetch(url, { next: { revalidate: 600 } }) // 10分キャッシュ
    
    if (!response.ok) {
      console.error(`❌ Alpha Vantage API エラー: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data: any = await response.json()
    
    // エラーチェック
    if (data['Error Message'] || data['Note']) {
      console.error(`❌ Alpha Vantage API エラー:`, data['Error Message'] || data['Note'])
      return null
    }
    
    const realtimeData = data['Realtime Currency Exchange Rate']
    if (!realtimeData) {
      console.error('❌ 為替データが見つかりません')
      return null
    }
    
    const rate = parseFloat(realtimeData['5. Exchange Rate'])
    const timestamp = realtimeData['6. Last Refreshed']
    
    console.log(`✅ 為替レート: ${fromCurrency}/${toCurrency} = ${rate}円 (${timestamp})`)
    
    return {
      symbol: `${fromCurrency}/${toCurrency}`,
      rate: rate,
      timestamp: timestamp
    }
  } catch (error) {
    console.error('❌ Alpha Vantage API 通信エラー:', error)
    return null
  }
}

/**
 * Alpha Vantage APIから株価を取得
 * 
 * シンボル例:
 * - ^N225 (日経平均) ← Alpha Vantageでは非対応、代わりにETF使用
 * - AAPL (Apple)
 * - GOOGL (Google)
 */
export async function getStockPrice(symbol: string): Promise<StockData | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim()
  
  if (!apiKey) {
    console.error('❌ ALPHA_VANTAGE_API_KEY が設定されていません')
    return null
  }
  
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
  
  try {
    console.log(`📈 Alpha Vantage API: 株価取得中... (${symbol})`)
    const response = await fetch(url, { next: { revalidate: 600 } }) // 10分キャッシュ
    
    if (!response.ok) {
      console.error(`❌ Alpha Vantage API エラー: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data: any = await response.json()
    
    // エラーチェック
    if (data['Error Message'] || data['Note']) {
      console.error(`❌ Alpha Vantage API エラー:`, data['Error Message'] || data['Note'])
      return null
    }
    
    const quote = data['Global Quote']
    console.log(`📊 デバッグ: quote =`, JSON.stringify(quote).slice(0, 200))
    console.log(`📊 デバッグ: quote keys =`, quote ? Object.keys(quote) : 'null')
    console.log(`📊 デバッグ: price =`, quote ? quote['05. price'] : 'N/A')
    
    if (!quote || Object.keys(quote).length === 0 || !quote['05. price']) {
      console.error(`❌ 株価データが見つかりません: ${symbol}`)
      console.error(`   quote:`, quote)
      return null
    }
    
    const price = parseFloat(quote['05. price'])
    const change = parseFloat(quote['09. change'])
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''))
    const timestamp = quote['07. latest trading day']
    
    console.log(`✅ 株価: ${symbol} = $${price} (${change > 0 ? '+' : ''}${change}, ${changePercent}%) (${timestamp})`)
    
    return {
      symbol: symbol,
      price: price,
      change: change,
      changePercent: changePercent,
      timestamp: timestamp
    }
  } catch (error) {
    console.error('❌ Alpha Vantage API 通信エラー:', error)
    return null
  }
}

/**
 * 日経平均の代替: EWJ ETF (iShares MSCI Japan ETF)
 * 日本株式市場全体を追跡するETF
 */
export async function getNikkeiProxy(): Promise<StockData | null> {
  // EWJ ETFを使用（日本株式市場全体を追跡）
  const ewj = await getStockPrice('EWJ')
  
  if (!ewj) {
    return null
  }
  
  // EWJの価格を日経平均相当にスケール（概算）
  // EWJ: $60前後 → 日経平均: 39,000円前後
  // スケール係数: 約650倍
  const scaleFactor = 650
  
  return {
    symbol: '日経平均 (EWJ)',
    price: Math.round(ewj.price * scaleFactor),
    change: Math.round(ewj.change * scaleFactor),
    changePercent: ewj.changePercent,
    timestamp: ewj.timestamp
  }
}

/**
 * 週別データを生成（過去7週間）
 * 注意: Alpha Vantageの無料プランでは履歴データの取得に制限があるため、
 * 現在の値から推定値を生成
 */
export function generateWeeklyData(currentValue: number, weeks: number = 8): Array<{ week: string; value: number }> {
  const data = []
  const now = new Date()
  
  // トレンド: 過去7週間で±5%程度の変動
  const volatility = currentValue * 0.05 / weeks
  
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i * 7)
    
    // 過去ほど値が異なる（線形トレンド + ノイズ）
    const trend = -volatility * i
    const noise = (Math.random() - 0.5) * volatility
    const value = currentValue + trend + noise
    
    data.push({
      week: `${date.getMonth() + 1}/${date.getDate()}週`,
      value: Math.round(value * 100) / 100
    })
  }
  
  return data
}
