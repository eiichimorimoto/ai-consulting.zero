// ダッシュボード用型定義

export interface Profile {
  name: string
  company_id: string
  avatar_url?: string | null
}

export interface Company {
  id: string
  name?: string
  industry?: string
  employee_count?: number
  annual_revenue?: number
  established_date?: string
  prefecture?: string
  city?: string
  [key: string]: any
}

export interface Subscription {
  plan?: string
  [key: string]: any
}

export interface MarketData {
  usdJpy: { week: string; value: number; date?: string }[]
  nikkei: { week: string; value: number; date?: string }[]
  longRate: { week: string; value: number; date?: string }[]
  shortRate: { week: string; value: number; date?: string }[]
  commodities?: {
    oil?: { name: string; priceUsd: number; priceJpy: number; change: number }
    steel?: { name: string; priceUsd: number; priceJpy: number; change: number }
    copper?: { name: string; priceUsd: number; priceJpy: number; change: number }
    aluminum?: { name: string; priceUsd: number; priceJpy: number; change: number }
  }
}

export interface LocalInfo {
  laborCosts: {
    current: number
    change: number
    monthlyData: { month: string; value: number }[]
    sources: any[]
  }
  events: { title: string; url: string; description: string; date: string }[]
  infrastructure: { title: string; url: string; description: string; status: string }[]
  weather: {
    location?: string // 場所（都道府県+市区町村）
    timestamp?: string // 取得時刻（ISO形式）
    displayTime?: string // 表示用時刻
    current: { temp: number | null; icon: string; desc: string } // temp は null の可能性あり
    week: { day: string; date: string; icon: string; temp: number }[]
    hourly?: { time: string; temp: number; icon: string }[]
    alerts?: { type: string; title: string; description: string; severity: 'warning' | 'severe' | 'extreme' }[]
  }
  traffic: { title: string; url: string; description: string; status: string }[]
  logistics?: { title: string; url: string; description: string; category: string; status: string }[]
  _debug?: {
    searchArea: string
    searchTimestamp: string
    laborCosts?: any
    events?: any
    infrastructure?: any
    weather?: any
    apiKeyConfigured: boolean
  }
}

export interface IndustryTrend {
  category: string
  title: string
  description: string
  direction: 'up' | 'down' | 'stable'
  strength: 'strong' | 'moderate' | 'weak'
  impact: string
  source: string
}

export interface IndustryTrends {
  trends: IndustryTrend[]
  summary: {
    overallDirection: 'up' | 'down' | 'stable'
    outlook: string
    keyFactors: string[]
  }
}

export interface SWOTItem {
  point: string
  evidence: string
}

export interface Competitor {
  name: string
  strength: string
  comparison: string
}

export interface SWOTAnalysis {
  strengths: SWOTItem[]
  weaknesses: SWOTItem[]
  opportunities: SWOTItem[]
  threats: SWOTItem[]
  competitors: Competitor[]
  industryPosition: {
    ranking: string
    marketShare: string
    differentiation: string
  }
  reputation: {
    overall: string
    positives: Array<{
      comment: string
      source: string
    }>
    negatives: Array<{
      comment: string
      source: string
    }>
  }
}

export interface WorldNewsItem {
  headline: string
  summary: string
  impact: string
  direction: 'positive' | 'negative' | 'neutral'
  source: string
}

export interface WorldNewsCategory {
  category: 'it_tech' | 'ai' | 'economy' | 'conflict' | 'software'
  title: string
  items: WorldNewsItem[]
}

export interface WorldNews {
  categories: WorldNewsCategory[]
  overallImpact: {
    summary: string
    riskLevel: 'high' | 'medium' | 'low'
    opportunities: string[]
    threats: string[]
  }
}

export interface ForecastIndicator {
  name: string
  current: string
  forecast: string
  trend: 'up' | 'down' | 'stable'
  confidence: 'high' | 'medium' | 'low'
}

export interface ForecastRisk {
  risk: string
  probability: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  mitigation: string
}

export interface ForecastOpportunity {
  opportunity: string
  timing: string
  action: string
}

export interface IndustryForecast {
  shortTerm: {
    period: string
    outlook: 'positive' | 'neutral' | 'negative'
    keyFactors: { factor: string; impact: 'positive' | 'negative' | 'neutral'; description: string }[]
    prediction: string
  }
  midTerm: {
    period: string
    outlook: 'positive' | 'neutral' | 'negative'
    keyFactors: { factor: string; impact: 'positive' | 'negative' | 'neutral'; description: string }[]
    prediction: string
  }
  indicators: ForecastIndicator[]
  risks: ForecastRisk[]
  opportunities: ForecastOpportunity[]
  recommendation: string
}

export interface Notification {
  id: string
  type: 'system' | 'data' | 'action' | 'alert'
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  timestamp: Date
  read: boolean
  icon?: string
}

// 週ラベル生成ユーティリティ
export function getWeekLabels(count: number): string[] {
  const weeks: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(`${d.getMonth() + 1}/${d.getDate()}週`)
  }
  return weeks
}

