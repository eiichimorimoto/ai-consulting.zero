'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LineChart, IndustryChart } from './DashboardCharts'
import { useRouter } from 'next/navigation'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import InfrastructureMap from './InfrastructureMap'
import { MessageSquare } from 'lucide-react'
// HealthMonitorは削除（自動修復はバックグラウンドで実行、ユーザーには見せない）
import '../app/dashboard/dashboard.css'

interface Profile {
  id?: string
  name: string
  company_id: string
  avatar_url?: string | null
}

interface Company {
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

interface Subscription {
  plan?: string
  [key: string]: any
}

interface DashboardClientProps {
  profile: Profile
  company: Company | null
  subscription: Subscription | null
}

function getWeekLabels(count: number) {
  const weeks: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(`${d.getMonth() + 1}/${d.getDate()}週`)
  }
  return weeks
}

interface Commodity {
  key: string
  name: string
  unit: string
  price: number
  priceJpy: number
  change: number
  isJpy: boolean
}

interface MarketData {
  usdJpy: { week: string; value: number; date?: string }[]
  nikkei: { week: string; value: number; date?: string }[]
  longRate: { week: string; value: number; date?: string }[]
  shortRate: { week: string; value: number; date?: string }[]
  currentRate?: number
  currentNikkei?: number
  commodities?: Commodity[]
  industry?: string
}

interface LocalInfo {
  laborCosts: {
    current: number
    change: number
    monthly?: number // 月給
    yearly?: number // 年収
    monthlyData: { month: string; value: number }[]
    sources: any[]
    comparison?: {
      industryMonthly?: number
      industryYearly?: number
      industryAverage?: number
      minimumWage?: number
      industryHourlyRange?: { min?: number; max?: number }
    }
  }
  events: { title: string; url: string; description: string; date: string }[]
  infrastructure: { title: string; url: string; description: string; status: string }[]
  weather: {
    location?: string // 場所（都道府県+市区町村）
    timestamp?: string // 取得時刻（ISO形式）
    displayTime?: string // 表示用時刻
    current: { temp: number | null; icon: string; desc: string; humidity?: number; wind?: number; rain?: number } // temp は null の可能性あり
    week: { day: string; date: string; icon: string; temp: number; high?: number }[]
    hourly?: { hour: string; temp: number; icon: string }[]
    alerts?: { type: string; title: string; description: string; severity: 'warning' | 'severe' | 'extreme' }[]
  }
  traffic: { title: string; url: string; description: string; status: string }[]
  logistics?: { title: string; url: string; description: string; category: string; status: string }[]
  emergencyAlerts?: { type: string; title: string; description: string; severity?: string }[]
  _debug?: {
    searchArea: string
    searchTimestamp: string
    industry?: string
    laborCosts?: any
    events?: any
    infrastructure?: any
    traffic?: any
    weather?: any
    apiKeyConfigured: boolean
  }
}

interface IndustryTrend {
  category: string
  title: string
  description: string
  direction: 'up' | 'down' | 'stable'
  strength: 'strong' | 'moderate' | 'weak'
  impact: string
  source: string
}

interface IndustryTrends {
  trends: IndustryTrend[]
  summary: {
    overallDirection: 'up' | 'down' | 'stable'
    outlook: string
    keyFactors: string[]
  }
}

interface SWOTItem {
  point: string
  evidence: string
}

interface Competitor {
  name: string
  strength: string
  comparison: string
  reason?: string
}

interface SWOTAnalysis {
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
    positives: Array<string | { comment: string; source: string }>
    negatives: Array<string | { comment: string; source: string }>
  }
}

interface WorldNewsItem {
  headline: string
  summary: string
  impact: string
  direction: 'positive' | 'negative' | 'neutral'
  source: string
}

interface WorldNewsCategory {
  category: 'it_tech' | 'ai' | 'economy' | 'conflict' | 'software'
  title: string
  items: WorldNewsItem[]
}

interface WorldNews {
  categories: WorldNewsCategory[]
  overallImpact: {
    summary: string
    riskLevel: 'high' | 'medium' | 'low'
    opportunities: string[]
    threats: string[]
  }
}

interface ForecastIndicator {
  name: string
  current: string
  forecast: string
  trend: 'up' | 'down' | 'stable'
  confidence: 'high' | 'medium' | 'low'
}

interface ForecastRisk {
  risk: string
  probability: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  mitigation: string
}

interface ForecastOpportunity {
  opportunity: string
  timing: string
  action: string
}

interface IndustryForecast {
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

export default function DashboardClient({ profile, company, subscription }: DashboardClientProps) {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [localInfo, setLocalInfo] = useState<LocalInfo | null>(null)
  const [industryTrends, setIndustryTrends] = useState<IndustryTrends | null>(null)
  const [swotAnalysis, setSwotAnalysis] = useState<SWOTAnalysis | null>(null)
  const [swotError, setSwotError] = useState<string | null>(null)
  const [worldNews, setWorldNews] = useState<WorldNews | null>(null)
  const [industryForecast, setIndustryForecast] = useState<IndustryForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({})
  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({})
  const [consultationHistoryCount, setConsultationHistoryCount] = useState<number>(0)
  const [swotInfoOpen, setSwotInfoOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [debugPanelOpen, setDebugPanelOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const weeks = getWeekLabels(8)

  interface Notification {
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

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // 個別データ取得関数
  const fetchSectionData = async (sectionType: string, forceRefresh = false) => {
    try {
      setRefreshing(prev => ({ ...prev, [sectionType]: true }))
      
      let endpoint = ''
      switch (sectionType) {
        case 'market':
          endpoint = '/api/dashboard/market'
          break
        case 'local-info':
          endpoint = '/api/dashboard/local-info'
          break
        case 'industry-trends':
          endpoint = '/api/dashboard/industry-trends'
          break
        case 'swot-analysis':
          endpoint = '/api/dashboard/swot-analysis'
          break
        case 'world-news':
          endpoint = '/api/dashboard/world-news'
          break
        case 'industry-forecast':
          endpoint = '/api/dashboard/industry-forecast'
          break
        default:
          return
      }

      // 強制更新の場合はキャッシュを無視
      const url = forceRefresh ? `${endpoint}?refresh=true` : endpoint
      
      // fetchWithRetry を使用（529/429エラー時に自動リトライ）
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Cache-Control': forceRefresh ? 'no-cache' : 'default'
        }
      }, 120_000, 3) // タイムアウト120秒、最大3回リトライ（業界予測等の重いClaude API処理対応）

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const data = result.data
      const updatedAt = result.updatedAt || new Date().toISOString()

      // エラーレスポンスのチェック
      if (result.error) {
        throw new Error(result.error)
      }

      // データをセット
      switch (sectionType) {
        case 'market':
          setMarketData(data)
          break
        case 'local-info':
          setLocalInfo(data)
          break
        case 'industry-trends':
          setIndustryTrends(data)
          break
        case 'swot-analysis':
          // SWOT分析が空またはエラーの場合
          if (!data || (!data.strengths?.length && !data.weaknesses?.length && !data.opportunities?.length && !data.threats?.length)) {
            throw new Error('SWOT分析データが取得できませんでした')
          }
          setSwotError(null) // エラーをクリア
          setSwotAnalysis(data)
          break
        case 'world-news':
          setWorldNews(data)
          break
        case 'industry-forecast':
          setIndustryForecast(data)
          break
      }

      // 更新時刻を記録
      const now = new Date()
      const updatedTime = new Date(updatedAt)
      const diffMinutes = Math.floor((now.getTime() - updatedTime.getTime()) / (1000 * 60))
      const timeText = diffMinutes < 1 ? 'たった今' : diffMinutes < 60 ? `${diffMinutes}分前` : `${Math.floor(diffMinutes / 60)}時間前`
      setLastUpdated(prev => ({ ...prev, [sectionType]: timeText }))
    } catch (error) {
      console.error(`Failed to fetch ${sectionType}:`, error)
      // SWOT分析のエラーを記録
      if (sectionType === 'swot-analysis') {
        setSwotError('SWOT分析を作成できませんでした。企業情報が不足しているか、外部データの取得に失敗した可能性があります。')
      }
    } finally {
      setRefreshing(prev => ({ ...prev, [sectionType]: false }))
    }
  }

  // セッションストレージのキー（v9: ログアウトまでキャッシュ保持、自動更新なし）
  const SESSION_KEY = `dashboard_data_v9_${profile?.id || 'guest'}`
  const SESSION_INITIALIZED_KEY = `dashboard_initialized_v9_${profile?.id || 'guest'}`
  const COMPANY_VERSION_KEY = `dashboard_company_version_v1_${profile?.id || 'guest'}`
  const COMPANY_VERSION = company?.updated_at || 'unknown'

  // キャッシュからデータを復元（全データが揃っている場合のみ成功）
  const restoreFromCache = () => {
    try {
      const cached = sessionStorage.getItem(SESSION_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        // 全ての主要データが存在するかチェック（localInfoも含む）
        const hasAllData = data.marketData && 
                          data.localInfo &&
                          data.industryTrends && 
                          data.swotAnalysis && 
                          data.worldNews && 
                          data.industryForecast
        
        if (!hasAllData) {
          console.log('キャッシュが不完全なため、全データを再取得します')
          return false
        }
        
        setMarketData(data.marketData)
        setLocalInfo(data.localInfo)
        setIndustryTrends(data.industryTrends)
        setSwotAnalysis(data.swotAnalysis)
        setWorldNews(data.worldNews)
        setIndustryForecast(data.industryForecast)
        if (data.lastUpdated) setLastUpdated(data.lastUpdated)
        console.log('✅ キャッシュからデータを復元しました（localInfo含む）')
        return true
      }
    } catch (e) {
      console.error('Failed to restore cache:', e)
    }
    return false
  }

  // データをキャッシュに保存（localInfoも含む）
  const saveToCache = () => {
    try {
      const data = {
        marketData,
        localInfo,
        industryTrends,
        swotAnalysis,
        worldNews,
        industryForecast,
        lastUpdated,
        savedAt: Date.now()
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save cache:', e)
    }
  }

  // データ変更時にキャッシュを更新（localInfoも含む）
  useEffect(() => {
    if (marketData || localInfo || industryTrends || swotAnalysis || worldNews || industryForecast) {
      saveToCache()
    }
  }, [marketData, industryTrends, swotAnalysis, worldNews, industryForecast])

  // 相談履歴の件数を取得
  useEffect(() => {
    const fetchConsultationHistoryCount = async () => {
      try {
        const res = await fetch('/api/consulting/sessions')
        if (res.ok) {
          const data = await res.json()
          setConsultationHistoryCount(data.sessions?.length || 0)
        }
      } catch (error) {
        console.error('Failed to fetch consultation history count:', error)
      }
    }
    fetchConsultationHistoryCount()
  }, [])

  // 初回データ取得（ログイン後の初回セッションのみ全データ取得）
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // 会社情報が更新されていればキャッシュを破棄
        const storedCompanyVersion = sessionStorage.getItem(COMPANY_VERSION_KEY)
        const companyChanged = storedCompanyVersion !== COMPANY_VERSION
        if (companyChanged) {
          console.log('🏢 会社情報が更新されました。キャッシュをクリアします。')
          sessionStorage.setItem(COMPANY_VERSION_KEY, COMPANY_VERSION)
          sessionStorage.removeItem(SESSION_KEY)
          sessionStorage.removeItem(SESSION_INITIALIZED_KEY)
        }

        // セッションで初回かどうかをチェック
        const isFirstLoad = !sessionStorage.getItem(SESSION_INITIALIZED_KEY)
        
        // 全データを取得する関数
        const fetchAllData = async (forceRefresh = false) => {
          console.log('全データを取得中...')
          await Promise.all([
            fetchSectionData('market', forceRefresh),
            fetchSectionData('local-info', forceRefresh), // キャッシュ活用: 初回のみ取得、更新ボタンで再取得可能
            fetchSectionData('industry-trends', forceRefresh),
            fetchSectionData('swot-analysis', forceRefresh),
            fetchSectionData('world-news', forceRefresh),
            fetchSectionData('industry-forecast', forceRefresh),
          ])
        }
        
        if (isFirstLoad) {
          // 初回ログイン時は全データを取得
          console.log('🚀 初回ログイン: 全データを取得します')
          await fetchAllData(companyChanged)
          // 初回フラグをセット
          sessionStorage.setItem(SESSION_INITIALIZED_KEY, Date.now().toString())
        } else {
          // 初回以降はキャッシュからデータを復元（自動更新しない）
          console.log('📦 キャッシュからデータを復元します（自動更新なし）')
          const restored = restoreFromCache()
          if (!restored) {
            // キャッシュがない・不完全な場合は全データを取得
            console.log('⚠️ キャッシュが不完全なため、全データを取得します')
            await fetchAllData()
          }
          // キャッシュがある場合は何もしない（手動更新のみ）
        }
      } catch (error) {
        console.error('Dashboard data fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [profile?.id])

  // 画面がアクティブになったときの処理
  // ※ 自動更新は行わない（ユーザー要望：ログアウトまでキャッシュを保持）
  // 手動で更新ボタンをクリックした場合のみ更新される

  // 通知データの取得
  useEffect(() => {
    const fetchNotifications = async () => {
      // モック通知データ（実際にはSupabaseから取得）
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'alert',
          title: '為替レートの大きな変動',
          message: 'USD/JPYが156.50円を突破しました。輸出企業への影響にご注意ください。',
          action: {
            label: '詳細を見る',
            onClick: () => {
              scrollToSection('market-section')
              setNotificationsOpen(false)
            }
          },
          timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10分前
          read: false,
          icon: '📈'
        },
        {
          id: '2',
          type: 'data',
          title: '業界動向データが更新されました',
          message: '機械部品業界の最新データ（3ヶ月分）が利用可能です。',
          action: {
            label: '業界動向を見る',
            onClick: () => {
              scrollToSection('industry-trends-section')
              setNotificationsOpen(false)
            }
          },
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2時間前
          read: false,
          icon: '📊'
        },
        {
          id: '3',
          type: 'action',
          title: '新しい相談履歴があります',
          message: '昨日の相談セッションの分析結果が準備できました。',
          action: {
            label: '履歴を見る',
            onClick: () => {
              router.push('/dashboard/history')
              setNotificationsOpen(false)
            }
          },
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1日前
          read: false,
          icon: '💬'
        },
        {
          id: '4',
          type: 'system',
          title: 'システムメンテナンスのお知らせ',
          message: '12月25日 2:00-4:00にメンテナンスを実施します。',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3日前
          read: true,
          icon: '🔧'
        },
        {
          id: '5',
          type: 'alert',
          title: '注目の世界情勢',
          message: 'EV部品市場に関する重要なニュースが追加されました。',
          action: {
            label: '世界情勢を見る',
            onClick: () => {
              scrollToSection('world-news-section')
              setNotificationsOpen(false)
            }
          },
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5時間前
          read: false,
          icon: '🌍'
        }
      ]
      setNotifications(mockNotifications)
      setUnreadCount(mockNotifications.filter(n => !n.read).length)
    }
    fetchNotifications()
  }, [])

  const getInitials = (name: string) => {
    const cleanName = name.replace(/\s+/g, '')
    return cleanName.length >= 2 ? cleanName.slice(0, 2) : cleanName.slice(0, 1)
  }

  const companyName = company?.name || '株式会社サンプル工業'

  // セクションにスクロールする関数
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const headerOffset = 80 // ヘッダーの高さ分のオフセット
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
    // モバイルの場合、サイドバーを閉じる
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }
  const companyInitial = companyName.charAt(0)
  const planName = subscription?.plan === 'pro' ? 'プロプラン' : subscription?.plan === 'basic' ? 'ベーシックプラン' : 'フリープラン'

  return (
    <>
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className="dashboard">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <Link href="/" className="logo">
              <Image
                src="/info-data/AI-LOGO007.png"
                alt="SolveWise"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="logo-text">SolveWise</span>
            </Link>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-section-title">メイン</div>
              <Link href="/dashboard" className="nav-item active">
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                ダッシュボード
              </Link>
              <a className="nav-item" onClick={() => window.location.href = '/consulting/start'}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                AIコンサルタント
              </a>
              <a className="nav-item" onClick={() => window.location.href = '/consulting/start'}>
                <MessageSquare className="nav-icon" style={{ width: '18px', height: '18px' }} />
                相談履歴
                {consultationHistoryCount > 0 && (
                  <span className="nav-badge">{consultationHistoryCount}</span>
                )}
              </a>
            </div>
            <div className="nav-section">
              <div className="nav-section-title">情報</div>
              <a className="nav-item" onClick={() => scrollToSection('market-section')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                マーケット概況
              </a>
              <a className="nav-item" onClick={() => scrollToSection('local-section')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                地域情報
              </a>
              <a className="nav-item" onClick={() => scrollToSection('world-news-section')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                世界情勢
              </a>
            </div>
            <div className="nav-section">
              <div className="nav-section-title">分析</div>
              <a className="nav-item" onClick={() => scrollToSection('industry-trends-section')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
                業界動向
              </a>
              <a className="nav-item" onClick={() => scrollToSection('swot-analysis-section')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                </svg>
                企業分析
              </a>
              <a className="nav-item" onClick={() => scrollToSection('recommendation-section')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
                  <path d="M9 21h6"/>
                </svg>
                経営への提言
              </a>
              <Link href="/dashboard/website-analysis" className="nav-item">
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Webサイト分析
              </Link>
            </div>
            <div className="nav-section">
              <div className="nav-section-title">設定</div>
              <Link href="/dashboard/settings" className="nav-item">
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
                アカウント設定
              </Link>
            </div>
          </nav>
          <div className="sidebar-footer">
            {/* アップグレードボタン（フリープラン・ベーシックプランの場合表示） */}
            {subscription?.plan !== 'pro' && (
              <button
                onClick={() => router.push('/dashboard/settings?tab=plan')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  background: 'transparent',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'
                  e.currentTarget.style.borderColor = '#f59e0b'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                プロにアップグレード
              </button>
            )}
            <div 
              className="user-card"
              onClick={() => router.push('/dashboard/settings')}
              style={{ cursor: 'pointer' }}
            >
              <div className="user-avatar">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    style={{ borderRadius: '50%' }}
                  />
                ) : (
                  getInitials(profile.name)
                )}
              </div>
              <div>
                <div className="user-name">{profile.name}</div>
                <div className="user-role">{planName}</div>
              </div>
            </div>
          </div>
        </aside>
        <main className="main">
          {/* Header + Welcome帯 固定ラッパー */}
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: '220px',
            right: 0,
            zIndex: 100,
            background: 'rgba(248, 250, 252, 0.6)',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <header className="header">
              <div className="header-left">
                <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                  <span></span><span></span><span></span>
                </button>
                <h1 className="page-title">ダッシュボード</h1>
              </div>
              <div className="header-right">
                <button className="header-btn">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </button>
                <button 
                  className="header-btn" 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  style={{ position: 'relative' }}
                >
                  <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                  {unreadCount > 0 && <span className="notification-dot"></span>}
                </button>
              </div>
            </header>
            <section className="welcome-section" style={{ 
              margin: 0,
              padding: 0
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.08) 0%, rgba(226, 232, 240, 0.05) 50%, rgba(241, 245, 249, 0.08) 100%)',
                backdropFilter: 'blur(2px)',
                borderRadius: '0',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
                borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}>
                {/* AI風ニューラルネットワーク背景パターン */}
                <svg 
                  style={{
                    position: 'absolute',
                    right: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '320px',
                    height: '200px',
                    opacity: 0.12,
                    pointerEvents: 'none'
                  }}
                  viewBox="0 0 400 250"
                >
                  {/* ノード */}
                  <circle cx="50" cy="60" r="8" fill="#6366f1"/>
                  <circle cx="50" cy="125" r="8" fill="#6366f1"/>
                  <circle cx="50" cy="190" r="8" fill="#6366f1"/>
                  <circle cx="140" cy="45" r="10" fill="#8b5cf6"/>
                  <circle cx="140" cy="95" r="10" fill="#8b5cf6"/>
                  <circle cx="140" cy="155" r="10" fill="#8b5cf6"/>
                  <circle cx="140" cy="205" r="10" fill="#8b5cf6"/>
                  <circle cx="230" cy="70" r="12" fill="#a855f7"/>
                  <circle cx="230" cy="125" r="12" fill="#a855f7"/>
                  <circle cx="230" cy="180" r="12" fill="#a855f7"/>
                  <circle cx="320" cy="95" r="10" fill="#c084fc"/>
                  <circle cx="320" cy="155" r="10" fill="#c084fc"/>
                  <circle cx="380" cy="125" r="14" fill="#6366f1"/>
                  {/* 接続線 */}
                  <line x1="50" y1="60" x2="140" y2="45" stroke="#6366f1" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="50" y1="60" x2="140" y2="95" stroke="#6366f1" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="50" y1="125" x2="140" y2="95" stroke="#6366f1" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="50" y1="125" x2="140" y2="155" stroke="#6366f1" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="50" y1="190" x2="140" y2="155" stroke="#6366f1" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="50" y1="190" x2="140" y2="205" stroke="#6366f1" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="140" y1="45" x2="230" y2="70" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="140" y1="95" x2="230" y2="70" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="140" y1="95" x2="230" y2="125" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="140" y1="155" x2="230" y2="125" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="140" y1="155" x2="230" y2="180" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="140" y1="205" x2="230" y2="180" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="230" y1="70" x2="320" y2="95" stroke="#a855f7" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="230" y1="125" x2="320" y2="95" stroke="#a855f7" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="230" y1="125" x2="320" y2="155" stroke="#a855f7" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="230" y1="180" x2="320" y2="155" stroke="#a855f7" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="320" y1="95" x2="380" y2="125" stroke="#c084fc" strokeWidth="2" opacity="0.6"/>
                  <line x1="320" y1="155" x2="380" y2="125" stroke="#c084fc" strokeWidth="2" opacity="0.6"/>
                </svg>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#6366f1',
                    fontWeight: '600',
                    marginBottom: '4px',
                    letterSpacing: '0.5px'
                  }}>おかえりなさい</p>
                  <h1 style={{ 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    margin: '0 0 8px 0'
                  }}>{profile.name}さん、今日もよろしくお願いします</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: 'white'
                    }}>
                      <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      </svg>
                      {companyName}
                    </div>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>
                      {company?.industry || ''}{company?.industry && company?.prefecture ? ' / ' : ''}{company?.prefecture || ''}
                      {(company?.industry || company?.prefecture) && company?.employee_count ? ' / ' : ''}
                      {company?.employee_count ? `従業員: ${company.employee_count}名` : ''}
                    </span>
                  </div>
                </div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* 日時表示 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '2px'
                  }}>
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#64748b',
                      fontWeight: '500'
                    }}>{currentTime}</span>
                  </div>
                  
                  {/* 相談履歴ボタン */}
                  <button 
                    onClick={() => router.push('/dashboard/consultation-history')}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(100, 116, 139, 0.1)',
                      color: '#475569',
                      border: '1px solid rgba(100, 116, 139, 0.2)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(100, 116, 139, 0.15)'
                      e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.3)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(100, 116, 139, 0.1)'
                      e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.2)'
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                      <path d="M12 8v4l3 3"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    相談履歴
                  </button>
                  
                  {/* AIコンサルタントに相談ボタン */}
                  <button 
                    onClick={() => window.location.href = '/consulting/start'}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 3px 10px rgba(99, 102, 241, 0.25)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 5px 14px rgba(99, 102, 241, 0.35)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 3px 10px rgba(99, 102, 241, 0.25)'
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    AIに相談
                  </button>
                </div>
              </div>
            </section>
          </div>
          {/* 固定ラッパー終了 */}

          <div className="content" style={{ paddingTop: '180px' }}>
            {/* 情報セクション大見出し */}
            <div className="section-category-wrapper">
              <div className="section-category-header">
                <div className="section-category-accent"></div>
                <h3 className="section-category-title">
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  情報
                </h3>
                <div className="section-category-accent"></div>
              </div>
            </div>

            {/* 交通情報テロップ（ブラウザ幅） */}
            {localInfo ? (
              localInfo.traffic && localInfo.traffic.length > 0 ? (
                <div className="traffic-ticker-container">
                  <div className="traffic-ticker-label">
                    <span className="traffic-icon">🚗</span>
                    <span>交通情報</span>
                  </div>
                  <div className="traffic-ticker-track">
                    <div className="traffic-ticker-content">
                      {/* 2回繰り返してシームレスにループ */}
                      {[...localInfo.traffic, ...localInfo.traffic].map((item, idx) => (
                        <span key={idx} className="traffic-ticker-item">
                          <span className="traffic-status-icon">
                            {item.status === 'normal' ? '🟢' : item.status === 'warning' ? '🟡' : '🔴'}
                          </span>
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="traffic-ticker-link"
                          >
                            {item.title}
                            <span className={`traffic-status-text ${item.status === 'warning' ? 'status-warning' : item.status === 'error' ? 'status-error' : 'status-normal'}`}>
                              [{item.status === 'warning' ? '遅延' : item.status === 'error' ? '運休' : '通常'}]
                            </span>
                          </a>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="traffic-ticker-container" style={{ background: 'var(--bg-sidebar)' }}>
                  <div className="traffic-ticker-label">
                    <span className="traffic-icon">🚗</span>
                    <span>交通情報</span>
                  </div>
                  <div style={{ 
                    padding: '8px 16px', 
                    fontSize: '13px', 
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>🟢</span>
                    <span>現在、特別な交通情報はありません（{company?.location || 'エリア'}周辺）</span>
                  </div>
                </div>
              )
            ) : null}

            <section id="market-section" className="market-section">
              <div className="section-header">
                <h2 className="section-title">
                  <svg viewBox="0 0 24 24">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  マーケット概況
                </h2>
                <div className="section-header-right">
                  <span className="update-time">
                    {refreshing['market'] ? '更新中...' : lastUpdated['market'] ? `${lastUpdated['market']}更新` : '読み込み中...'}
                  </span>
                  <button 
                    className="refresh-btn" 
                    onClick={() => fetchSectionData('market', true)}
                    disabled={refreshing['market']}
                    title="更新"
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      className={refreshing['market'] ? 'spinning' : ''}
                      style={{ width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
                    >
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="market-grid">
                {loading ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>読み込み中...</div>
                ) : (
                  <>
                    <div className="market-card">
                      <div className="market-card-header">
                        <span className="market-label">USD/JPY</span>
                        {marketData?.usdJpy && marketData.usdJpy.length > 1 && (
                          <span className={`market-change ${marketData.usdJpy[marketData.usdJpy.length - 1].value > marketData.usdJpy[0].value ? 'up' : 'down'}`}>
                            {((marketData.usdJpy[marketData.usdJpy.length - 1].value / marketData.usdJpy[0].value - 1) * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="market-value">¥{marketData?.usdJpy?.[marketData.usdJpy.length - 1]?.value.toFixed(2) || '156.42'}</div>
                      <div className="chart-container">
                        {marketData?.usdJpy ? (
                          <LineChart
                            canvasId="chartUsdJpy"
                            tooltipId="tooltipUsdJpy"
                            data={marketData.usdJpy.map(d => ({ value: d.value, week: d.week, date: d.date || d.week }))}
                            options={{ prefix: '¥', lineColor: '#6366F1' }}
                          />
                        ) : (
                          <LineChart
                            canvasId="chartUsdJpy"
                            tooltipId="tooltipUsdJpy"
                            data={weeks.map((w, i) => {
                              const d = new Date()
                              d.setDate(d.getDate() - (7 - i) * 7)
                              return { value: 154.20 + i * 0.3, week: w, date: d.toISOString() }
                            })}
                            options={{ prefix: '¥', lineColor: '#6366F1' }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="market-card">
                      <div className="market-card-header">
                        <span className="market-label">日経平均</span>
                        {marketData?.nikkei && marketData.nikkei.length > 1 && (
                          <span className={`market-change ${marketData.nikkei[marketData.nikkei.length - 1].value > marketData.nikkei[0].value ? 'up' : 'down'}`}>
                            {((marketData.nikkei[marketData.nikkei.length - 1].value / marketData.nikkei[0].value - 1) * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="market-value">¥{marketData?.nikkei?.[marketData.nikkei.length - 1]?.value.toLocaleString() || '39,847'}</div>
                      <div className="chart-container">
                        {marketData?.nikkei ? (
                          <LineChart
                            canvasId="chartNikkei"
                            tooltipId="tooltipNikkei"
                            data={marketData.nikkei.map(d => ({ value: d.value, week: d.week, date: d.date || d.week }))}
                            options={{ prefix: '¥', lineColor: '#10B981' }}
                          />
                        ) : (
                          <LineChart
                            canvasId="chartNikkei"
                            tooltipId="tooltipNikkei"
                            data={weeks.map((w, i) => {
                              const d = new Date()
                              d.setDate(d.getDate() - (7 - i) * 7)
                              return { value: 38200 + i * 200, week: w, date: d.toISOString() }
                            })}
                            options={{ prefix: '¥', lineColor: '#10B981' }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="market-card">
                      <div className="market-card-header">
                        <span className="market-label">長期金利（10年）</span>
                        {marketData?.longRate && marketData.longRate.length > 1 && (
                          <span className={`market-change ${marketData.longRate[marketData.longRate.length - 1].value > marketData.longRate[0].value ? 'up' : 'down'}`}>
                            {((marketData.longRate[marketData.longRate.length - 1].value / marketData.longRate[0].value - 1) * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="market-value">{marketData?.longRate?.[marketData.longRate.length - 1]?.value.toFixed(3) || '1.085'}%</div>
                      <div className="chart-container">
                        {marketData?.longRate ? (
                          <LineChart
                            canvasId="chartLongRate"
                            tooltipId="tooltipLongRate"
                            data={marketData.longRate.map(d => ({ value: d.value, week: d.week, date: d.date || d.week }))}
                            options={{ unit: '%', lineColor: '#EF4444' }}
                          />
                        ) : (
                          <LineChart
                            canvasId="chartLongRate"
                            tooltipId="tooltipLongRate"
                            data={weeks.map((w, i) => {
                              const d = new Date()
                              d.setDate(d.getDate() - (7 - i) * 7)
                              return { value: 1.12 - i * 0.01, week: w, date: d.toISOString() }
                            })}
                            options={{ unit: '%', lineColor: '#EF4444' }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="market-card">
                      <div className="market-card-header">
                        <span className="market-label">短期金利</span>
                        {marketData?.shortRate && marketData.shortRate.length > 1 && (
                          <span className={`market-change ${marketData.shortRate[marketData.shortRate.length - 1].value > marketData.shortRate[0].value ? 'up' : 'down'}`}>
                            {((marketData.shortRate[marketData.shortRate.length - 1].value / marketData.shortRate[0].value - 1) * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="market-value">{marketData?.shortRate?.[marketData.shortRate.length - 1]?.value.toFixed(2) || '0.25'}%</div>
                      <div className="chart-container">
                        {marketData?.shortRate ? (
                          <LineChart
                            canvasId="chartShortRate"
                            tooltipId="tooltipShortRate"
                            data={marketData.shortRate.map(d => ({ value: d.value, week: d.week, date: d.date || d.week }))}
                            options={{ unit: '%', lineColor: '#F59E0B' }}
                          />
                        ) : (
                          <LineChart
                            canvasId="chartShortRate"
                            tooltipId="tooltipShortRate"
                            data={weeks.map((w, i) => {
                              const d = new Date()
                              d.setDate(d.getDate() - (7 - i) * 7)
                              return { value: 0.10 + i * 0.02, week: w, date: d.toISOString() }
                            })}
                            options={{ unit: '%', lineColor: '#F59E0B' }}
                          />
                        )}
                      </div>
                    </div>
                    {/* 原材料・仕入材価格（業種別） - 常に表示 */}
                    <div className="market-card" style={{ gridColumn: '1 / -1' }}>
                      <div className="market-card-header">
                        <span className="market-label">📦 関連原材料・仕入材価格</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                          ({company?.industry || '一般'}向け)
                        </span>
                        {!marketData?.commodities && (
                          <button 
                            onClick={() => fetchSectionData('market', true)}
                            style={{ 
                              marginLeft: 'auto', 
                              padding: '4px 8px', 
                              fontSize: '10px', 
                              background: 'var(--accent)', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            データ取得
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '12px' }}>
                        {marketData?.commodities && Array.isArray(marketData.commodities) && marketData.commodities.length > 0 ? (
                          marketData.commodities.map((c: Commodity, idx: number) => (
                            <div key={c.key || idx} style={{ 
                              padding: '12px', 
                              background: 'var(--bg-main)', 
                              borderRadius: '8px',
                              border: '1px solid var(--border)'
                            }}>
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                {c.name}
                                {c.unit && <span style={{ fontSize: '8px', marginLeft: '4px', color: 'var(--text-light)' }}>({c.unit})</span>}
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {c.isJpy ? `¥${c.priceJpy?.toLocaleString()}` : `¥${c.priceJpy?.toLocaleString()}`}
                              </div>
                              <div style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '2px' }}>
                                {!c.isJpy && c.price && `(${c.price} ${c.unit})`}
                              </div>
                              <div style={{ 
                                fontSize: '10px', 
                                color: (c.change || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                                marginTop: '2px'
                              }}>
                                {(c.change || 0) >= 0 ? '↑' : '↓'} {Math.abs(c.change || 0).toFixed(1)}%
                              </div>
                            </div>
                          ))
                        ) : (
                          // フォールバック表示（デフォルト原材料）
                          [
                            { name: '原油(WTI)', priceJpy: 11340, price: 72.5, unit: '$/バレル', change: 1.2 },
                            { name: '鉄鋼', priceJpy: 106300, price: 680, unit: '$/t', change: -0.8 },
                            { name: '電力', priceJpy: 28, price: 28, unit: '円/kWh', change: 2.1, isJpy: true },
                            { name: '海上運賃', priceJpy: 289420, price: 1850, unit: 'pt', change: -1.5 }
                          ].map((c, idx) => (
                            <div key={idx} style={{ 
                              padding: '12px', 
                              background: 'var(--bg-main)', 
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              opacity: 0.7
                            }}>
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                {c.name}
                                {c.unit && <span style={{ fontSize: '8px', marginLeft: '4px', color: 'var(--text-light)' }}>({c.unit})</span>}
                                <span style={{ fontSize: '8px', marginLeft: '4px' }}>(参考値)</span>
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                ¥{c.priceJpy?.toLocaleString()}
                              </div>
                              <div style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '2px' }}>
                                {!c.isJpy && c.price && `(${c.price} ${c.unit})`}
                              </div>
                              <div style={{ 
                                fontSize: '10px', 
                                color: c.change >= 0 ? 'var(--success)' : 'var(--danger)',
                                marginTop: '2px'
                              }}>
                                {c.change >= 0 ? '↑' : '↓'} {Math.abs(c.change).toFixed(1)}%
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="action-section">
              <div className="action-grid">
                <div className="ai-card">
                  <div className="ai-card-left">
                    <div className="ai-avatar">
                      <div className="ai-pulse"></div>
                      <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
                        <circle cx="9" cy="13" r="1"/>
                        <circle cx="15" cy="13" r="1"/>
                        <path d="M9 17h6"/>
                      </svg>
                    </div>
                    <div>
                      <div className="ai-card-title">AIコンサルタント</div>
                      <div className="ai-card-status">
                        <span className="online-dot"></span>
                        オンライン
                      </div>
                    </div>
                  </div>
                  <button className="ai-card-btn" onClick={() => router.push('/consulting/start')}>
                    相談を始める
                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--primary)', fill: 'none', strokeWidth: 2 }}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
                <div className="history-card">
                  <div className="history-left">
                    <div className="history-icon">
                      <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px', stroke: 'var(--warning)', fill: 'none', strokeWidth: 1.5 }}>
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                        <rect x="9" y="3" width="6" height="4" rx="1"/>
                        <path d="M9 12h6M9 16h6"/>
                      </svg>
                    </div>
                    <div>
                      <div className="history-title">相談履歴</div>
                      <div className="history-stats">
                        <div className="history-stat">
                          <span className="stat-indicator active"></span>
                          <span className="stat-label">進行中</span>
                          <span className="stat-count">2</span>
                        </div>
                        <div className="history-stat">
                          <span className="stat-indicator completed"></span>
                          <span className="stat-label">完了</span>
                          <span className="stat-count">5</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="history-btn" onClick={() => router.push('/consulting/start')}>
                    履歴を見る
                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
            </section>

            <section id="local-section" className="local-section">
              <div className="section-header">
                <h2 className="section-title">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {company?.city || '名古屋市'}エリア情報
                </h2>
                <div className="section-header-right">
                  <span className="update-time">
                    {refreshing['local-info'] ? '更新中...' : lastUpdated['local-info'] ? `${lastUpdated['local-info']}更新` : '読み込み中...'}
                  </span>
                  <button 
                    className="refresh-btn" 
                    onClick={() => fetchSectionData('local-info', true)}
                    disabled={refreshing['local-info']}
                    title="更新"
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      className={refreshing['local-info'] ? 'spinning' : ''}
                      style={{ width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
                    >
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                    </svg>
                  </button>
                  <button 
                    className="debug-btn" 
                    onClick={() => setDebugPanelOpen(!debugPanelOpen)}
                    title="デバッグ情報"
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      style={{ width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
                    >
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="local-grid" style={{ gap: '12px' }}>
                <div className="local-card" style={{ padding: '12px' }}>
                  <div className="local-card-header" style={{ marginBottom: '8px' }}>
                    <div className="local-icon labor">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <span className="local-title">人件費動向</span>
                  </div>
                  {/* メイン時給表示 + 説明 */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', 
                    borderRadius: '10px', 
                    padding: '12px',
                    color: 'white',
                    marginBottom: '10px'
                  }}>
                    <div style={{ fontSize: '9px', opacity: 0.9, marginBottom: '4px' }}>
                      {company?.prefecture || '愛知県'}・{company?.industry || '製造業'}の平均時給
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '28px', fontWeight: '700' }}>
                        {localInfo?.laborCosts?.comparison?.industryAverage?.toLocaleString() || '1,280'}
                      </span>
                      <span style={{ fontSize: '12px' }}>円/時</span>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: (localInfo?.laborCosts?.change || 2.5) >= 0 ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.3)',
                        marginLeft: 'auto'
                      }}>
                        前年比 {(localInfo?.laborCosts?.change || 2.5) >= 0 ? '+' : ''}{localInfo?.laborCosts?.change || 2.5}%
                      </span>
                    </div>
                    <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '6px', lineHeight: '1.4' }}>
                      ※ {company?.prefecture || '愛知県'}内の{company?.industry || '製造業'}における<br/>
                      パート・アルバイトの平均募集時給です
                    </div>
                  </div>
                  <div className="local-content" style={{ fontSize: '10px', lineHeight: '1.4' }}>
                    {/* 最低賃金情報 */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '6px 8px',
                      background: 'var(--bg-main)',
                      borderRadius: '6px',
                      marginBottom: '6px'
                    }}>
                      <span style={{ fontWeight: 600 }}>{company?.prefecture || '愛知県'}最低賃金</span>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {localInfo?.laborCosts?.comparison?.minimumWage?.toLocaleString() || '1,077'}円
                        <span style={{ fontSize: '8px', color: '#888', fontWeight: '400' }}> (2024/10)</span>
                      </span>
                    </div>
                    {/* 平均給与（月給・年収） */}
                    <div style={{ 
                      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', 
                      padding: '8px', 
                      borderRadius: '6px',
                      border: '1px solid #86efac',
                      marginBottom: '6px'
                    }}>
                      <div style={{ fontWeight: 600, color: '#166534', marginBottom: '6px', fontSize: '11px' }}>
                        💰 {company?.prefecture || '愛知県'}・{company?.industry || '製造業'}の平均給与
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div style={{ background: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#666' }}>月給</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#166534' }}>
                            {(localInfo?.laborCosts as any)?.monthly?.toLocaleString() || (localInfo?.laborCosts as any)?.comparison?.industryMonthly?.toLocaleString() || '28.5'}万円
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#666' }}>年収</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#166534' }}>
                            {(localInfo?.laborCosts as any)?.yearly?.toLocaleString() || (localInfo?.laborCosts as any)?.comparison?.industryYearly?.toLocaleString() || '420'}万円
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '8px', color: '#666', marginTop: '4px', textAlign: 'center' }}>
                        ※正社員・フルタイム勤務の場合
                      </div>
                    </div>
                    {/* 業種別時給相場 */}
                    <div style={{ 
                      background: '#f0f9ff', 
                      padding: '8px', 
                      borderRadius: '6px',
                      border: '1px solid #bae6fd'
                    }}>
                      <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '6px', fontSize: '11px' }}>
                        📊 {company?.industry || '製造業'}の時給相場（パート）
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div style={{ background: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#666' }}>下限</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0369a1' }}>
                            {localInfo?.laborCosts?.comparison?.industryHourlyRange?.min?.toLocaleString() || '1,100'}円
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#666' }}>上限</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0369a1' }}>
                            {localInfo?.laborCosts?.comparison?.industryHourlyRange?.max?.toLocaleString() || '1,600'}円
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* データソース */}
                    <div style={{ fontSize: '8px', color: '#999', marginTop: '6px' }}>
                      出典: 厚生労働省賃金構造基本統計調査
                    </div>
                  </div>
                </div>
                <div className="local-card" style={{ padding: '12px' }}>
                  <div className="local-card-header" style={{ marginBottom: '8px' }}>
                    <div className="local-icon event">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                    </div>
                    <span className="local-title">注目イベント</span>
                  </div>
                  {/* ミニカレンダー（月ナビ付き） */}
                  <div style={{ 
                    background: 'var(--bg-main)',
                    padding: '8px',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    {/* 月ナビゲーション */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <button
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          padding: '4px 8px',
                          fontSize: '12px',
                          color: 'var(--text-secondary)'
                        }}
                      >◀</button>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
                      </span>
                      <button
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          padding: '4px 8px',
                          fontSize: '12px',
                          color: 'var(--text-secondary)'
                        }}
                      >▶</button>
                    </div>
                    {/* 曜日ヘッダー */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                      {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                        <div key={i} style={{ 
                          fontSize: '9px', 
                          textAlign: 'center', 
                          color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--text-light)',
                          fontWeight: '600'
                        }}>{d}</div>
                      ))}
                    </div>
                    {/* 日付グリッド */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginTop: '4px' }}>
                      {(() => {
                        const today = new Date();
                        const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
                        const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
                        const startPadding = firstDay.getDay();
                        const isCurrentMonth = today.getFullYear() === calendarMonth.getFullYear() && today.getMonth() === calendarMonth.getMonth();
                        const days = [];
                        for (let i = 0; i < startPadding; i++) days.push(<div key={`p${i}`}></div>);
                        for (let d = 1; d <= lastDay.getDate(); d++) {
                          const isToday = isCurrentMonth && d === today.getDate();
                          const hasEvent = localInfo?.events?.some((e: any) => {
                            const eventMonth = e.date?.match(/(\d+)月/)?.[1] || e.date?.match(/^(\d+)\//)?.[1];
                            const eventDay = e.date?.match(/(\d+)日/)?.[1] || e.date?.match(/\/(\d+)/)?.[1] || e.date?.match(/(\d+)/)?.[1];
                            const matchMonth = eventMonth ? parseInt(eventMonth) === calendarMonth.getMonth() + 1 : true;
                            return matchMonth && eventDay && parseInt(eventDay) === d;
                          });
                          days.push(
                            <div key={d} style={{ 
                              fontSize: '10px', 
                              textAlign: 'center',
                              padding: '2px',
                              borderRadius: '4px',
                              background: isToday ? '#3b82f6' : hasEvent ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                              color: isToday ? 'white' : hasEvent ? '#10b981' : 'var(--text-main)',
                              fontWeight: isToday || hasEvent ? '600' : '400'
                            }}>{d}</div>
                          );
                        }
                        return days;
                      })()}
                    </div>
                  </div>
                  {/* イベントリスト（5件表示） */}
                  <div style={{ fontSize: '10px' }}>
                    {localInfo?.events && localInfo.events.length > 0 ? (
                      localInfo.events.slice(0, 5).map((event, idx) => (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          padding: '4px 0',
                          borderBottom: idx < 4 ? '1px solid var(--border)' : 'none'
                        }}>
                          <span style={{ 
                            background: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][idx] || '#64748b',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}>{event.date || '近日'}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {event.title || `イベント${idx + 1}`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '600' }}>1/22-24</span>
                          <span>ものづくりワールド名古屋</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '600' }}>1/30</span>
                          <span>中部DXセミナー</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '600' }}>2/5-6</span>
                          <span>{company?.prefecture || '愛知県'}中小企業展</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ background: '#8b5cf6', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '600' }}>2/15</span>
                          <span>製造業DX推進フォーラム</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                          <span style={{ background: '#ec4899', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '600' }}>2/20</span>
                          <span>中部地区商談会</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="local-card" style={{ padding: '12px' }}>
                  <div className="local-card-header" style={{ marginBottom: '8px' }}>
                    <div className="local-icon infra">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                        <path d="M4 22v-7"/>
                      </svg>
                    </div>
                    <span className="local-title">インフラ状況</span>
                  </div>
                  {/* Google Maps */}
                  <InfrastructureMap
                    infrastructure={localInfo?.infrastructure || []}
                    prefecture={company?.prefecture || '愛知県'}
                    city={company?.city || '名古屋市'}
                    address={company?.address}
                    postalCode={company?.postal_code}
                    companyName={company?.name}
                  />
                  {/* 詳細リスト（タイトルのみ・3件） */}
                  <div style={{ fontSize: '10px', background: 'var(--bg-main)', padding: '8px', borderRadius: '6px' }}>
                    {localInfo?.infrastructure && localInfo.infrastructure.length > 0 ? (
                      localInfo.infrastructure.slice(0, 3).map((item, idx) => {
                        const circleNumbers = ['①', '②', '③']
                        const statusColor = item.status === 'error' ? '#ef4444' : 
                                           item.status === 'warning' ? '#f59e0b' : '#10b981'
                        
                        return (
                          <div key={idx} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            padding: '4px 0',
                            borderBottom: idx < 2 ? '1px solid var(--border)' : 'none'
                          }}>
                            <span style={{ 
                              fontSize: '12px',
                              flexShrink: 0
                            }}>
                              {circleNumbers[idx]}
                            </span>
                            <span style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%',
                              background: statusColor,
                              flexShrink: 0
                            }}></span>
                            <span style={{ flex: 1, fontSize: '10px' }}>{item.title}</span>
                          </div>
                        )
                      })
                    ) : (
                      <div style={{ 
                        padding: '6px 0', 
                        color: 'var(--text-secondary)', 
                        textAlign: 'center',
                        fontStyle: 'italic'
                      }}>
                        現在、インフラに関する特記事項はありません
                      </div>
                    )}
                  </div>
                </div>
                <div className="local-card" style={{ padding: '12px' }}>
                  <div className="local-card-header" style={{ marginBottom: '8px' }}>
                    <div className="local-icon weather">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <circle cx="12" cy="12" r="5"/>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                      </svg>
                    </div>
                    <span className="local-title">現在の天気</span>
                  </div>
                  {/* 当日の天気（大きく表示） */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                    borderRadius: '10px',
                    padding: '12px',
                    color: 'white',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '40px' }}>{localInfo?.weather?.current?.icon || '☀️'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>
                          {localInfo?.weather?.current?.temp || 8}°
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                          {localInfo?.weather?.current?.desc || '晴れ'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '10px', opacity: 0.85 }}>
                        <div>体感 {(localInfo?.weather?.current?.temp || 8) - 2}°</div>
                        <div>湿度 {localInfo?.weather?.current?.humidity || 45}%</div>
                        <div>風速 {localInfo?.weather?.current?.wind || 3}m/s</div>
                      </div>
                    </div>
                    {/* 降水確率 */}
                    {(localInfo?.weather?.current?.rain || 0) > 0 && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '6px 8px', 
                        background: 'rgba(255,255,255,0.2)', 
                        borderRadius: '6px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>🌧️</span>
                        <span>降水確率 {localInfo?.weather?.current?.rain || 0}%</span>
                      </div>
                    )}
                  </div>
                  {/* 週間天気（コンパクト） */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(5, 1fr)', 
                    gap: '4px',
                    background: 'var(--bg-main)',
                    padding: '8px',
                    borderRadius: '8px'
                  }}>
                    {localInfo?.weather?.week?.slice(0, 5).map((day, idx) => (
                      <div key={idx} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: 'var(--text-light)' }}>{day.day}</div>
                        <div style={{ fontSize: '16px', margin: '2px 0' }}>{day.icon}</div>
                        <div style={{ fontSize: '10px', fontWeight: '600' }}>{day.high || '--'}°</div>
                      </div>
                    )) || (
                      <>
                        {['火', '水', '木', '金', '土'].map((d, i) => (
                          <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: 'var(--text-light)' }}>{d}</div>
                            <div style={{ fontSize: '16px', margin: '2px 0' }}>{['☀️', '⛅', '🌧️', '☀️', '☀️'][i]}</div>
                            <div style={{ fontSize: '10px', fontWeight: '600' }}>{[10, 8, 6, 9, 11][i]}°</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  {/* 当日の時間別予報 */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      ⏰ 本日の時間別予報
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(6, 1fr)', 
                      gap: '4px',
                      background: 'var(--bg-main)',
                      padding: '8px',
                      borderRadius: '8px'
                    }}>
                      {(localInfo?.weather?.hourly && localInfo.weather.hourly.length > 0 
                        ? localInfo.weather.hourly.slice(0, 6)
                        : [
                            { hour: '9時', icon: '☀️', temp: 5 },
                            { hour: '12時', icon: '☀️', temp: 9 },
                            { hour: '15時', icon: '⛅', temp: 10 },
                            { hour: '18時', icon: '🌙', temp: 7 },
                            { hour: '21時', icon: '🌙', temp: 5 },
                            { hour: '24時', icon: '🌙', temp: 3 }
                          ]
                      ).map((h: { hour: string; icon: string; temp: number }, idx: number) => (
                        <div key={idx} style={{ 
                          textAlign: 'center',
                          padding: '4px',
                          background: idx === 0 ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{h.hour}</div>
                          <div style={{ fontSize: '14px', marginBottom: '2px' }}>{h.icon}</div>
                          <div style={{ fontSize: '11px', fontWeight: '600' }}>{h.temp}°</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 緊急情報・災害アラート */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: 'var(--text-secondary)', 
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🚨 緊急情報・災害速報
                    </div>
                    {(localInfo?.weather?.alerts && localInfo.weather.alerts.length > 0) || 
                     (localInfo?.emergencyAlerts && localInfo.emergencyAlerts.length > 0) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* 地震・津波などの緊急情報 */}
                        {localInfo?.emergencyAlerts?.map((alert: { type: string; title: string; description: string; severity?: string }, idx: number) => (
                          <div key={`emergency-${idx}`} style={{ 
                            padding: '8px 10px', 
                            background: alert.severity === 'critical' 
                              ? 'rgba(220, 38, 38, 0.2)' 
                              : alert.severity === 'warning'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                            borderRadius: '6px',
                            borderLeft: `3px solid ${
                              alert.severity === 'critical' 
                                ? '#dc2626' 
                                : alert.severity === 'warning'
                                ? '#f59e0b'
                                : '#3b82f6'
                            }`
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              marginBottom: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6'
                            }}>
                              <span>{alert.type === 'earthquake' ? '🌏' : alert.type === 'tsunami' ? '🌊' : alert.type === 'volcano' ? '🌋' : '🚨'}</span>
                              {alert.title}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              {alert.description}
                            </div>
                          </div>
                        ))}
                        {/* 気象警報 */}
                        {localInfo?.weather?.alerts?.map((alert: { type: string; title: string; description: string; severity: 'warning' | 'severe' | 'extreme' }, idx: number) => (
                          <div key={`weather-${idx}`} style={{ 
                            padding: '8px 10px', 
                            background: alert.severity === 'extreme' 
                              ? 'rgba(239, 68, 68, 0.15)' 
                              : alert.severity === 'severe'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                            borderRadius: '6px',
                            borderLeft: `3px solid ${
                              alert.severity === 'extreme' 
                                ? '#ef4444' 
                                : alert.severity === 'severe'
                                ? '#f59e0b'
                                : '#3b82f6'
                            }`
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              marginBottom: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: alert.severity === 'extreme' ? '#ef4444' : alert.severity === 'severe' ? '#f59e0b' : '#3b82f6'
                            }}>
                              <span>{alert.severity === 'extreme' ? '🚨' : alert.severity === 'severe' ? '⚠️' : 'ℹ️'}</span>
                              {alert.title}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              {alert.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '10px 12px', 
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '6px',
                        borderLeft: '3px solid #10b981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '16px' }}>✅</span>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#10b981' }}>
                            緊急情報なし
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            現在、地震・津波・気象警報等の発令はありません
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </section>

            {/* デバッグパネル */}
            {debugPanelOpen && localInfo?._debug && (
              <div className="debug-panel">
                <div className="debug-panel-header">
                  <h3>地域情報 デバッグ情報</h3>
                  <button onClick={() => setDebugPanelOpen(false)}>×</button>
                </div>
                <div className="debug-panel-content">
                  <div className="debug-section">
                    <h4>検索エリア・業種</h4>
                    <p>検索エリア: {localInfo._debug.searchArea}</p>
                    <p>業種: {localInfo._debug.industry || '未設定'}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      検索時刻: {new Date(localInfo._debug.searchTimestamp).toLocaleString('ja-JP')}
                    </p>
                    <p style={{ fontSize: '12px', color: localInfo._debug.apiKeyConfigured ? 'var(--success)' : 'var(--danger)' }}>
                      APIキー設定: {localInfo._debug.apiKeyConfigured ? '✓ 設定済み' : '✗ 未設定'}
                    </p>
                  </div>

                  {localInfo._debug.laborCosts && (
                    <div className="debug-section">
                      <h4>労務費検索</h4>
                      <p>検索クエリ数: {localInfo._debug.laborCosts.searchQueries?.length || 0}</p>
                      <details>
                        <summary>検索クエリ一覧</summary>
                        <ul>
                          {localInfo._debug.laborCosts.searchQueries?.map((q: string, i: number) => (
                            <li key={i} style={{ fontSize: '12px', marginBottom: '4px' }}>{q}</li>
                          ))}
                        </ul>
                      </details>
                      <details>
                        <summary>検索結果ログ</summary>
                        {localInfo._debug.laborCosts.searchLogs?.map((log: any, i: number) => (
                          <div key={i} style={{ marginBottom: '12px', padding: '8px', background: 'var(--bg-sidebar)', borderRadius: '4px' }}>
                            <p style={{ fontWeight: '600', fontSize: '12px' }}>クエリ: {log.query}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              結果数: {log.resultCount || 0} / 検証済み: {log.verifiedCount || log.results?.length || 0}
                            </p>
                            {log.results && log.results.length > 0 && (
                              <details style={{ marginTop: '4px' }}>
                                <summary style={{ fontSize: '11px', cursor: 'pointer' }}>結果詳細</summary>
                                {log.results.map((r: any, j: number) => (
                                  <div key={j} style={{ marginTop: '4px', padding: '4px', fontSize: '11px' }}>
                                    <p><strong>{r.title || 'タイトルなし'}</strong></p>
                                    <p style={{ color: 'var(--text-secondary)' }}>{r.description || '説明なし'}</p>
                                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: 'var(--primary)' }}>
                                      {r.url}
                                    </a>
                                  </div>
                                ))}
                              </details>
                            )}
                          </div>
                        ))}
                      </details>
                      <p style={{ fontSize: '12px', marginTop: '8px' }}>
                        抽出された時給: {localInfo._debug.laborCosts.extractedValue || 'N/A'}円
                      </p>
                    </div>
                  )}

                  {localInfo._debug.events && (
                    <div className="debug-section">
                      <h4>イベント検索</h4>
                      <p>検索クエリ: {localInfo._debug.events.searchQuery}</p>
                      <p>結果数: {localInfo._debug.events.resultCount || 0} / 検証済み: {localInfo._debug.events.verifiedCount || localInfo._debug.events.allResults?.length || 0}</p>
                      <details>
                        <summary>検索結果</summary>
                        {localInfo._debug.events.allResults?.map((r: any, i: number) => (
                          <div key={i} style={{ marginBottom: '8px', padding: '8px', background: 'var(--bg-sidebar)', borderRadius: '4px', fontSize: '12px' }}>
                            <p><strong>{r.title || 'タイトルなし'}</strong></p>
                            <p style={{ color: 'var(--text-secondary)' }}>{r.description || '説明なし'}</p>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--primary)' }}>
                              {r.url}
                            </a>
                          </div>
                        ))}
                      </details>
                    </div>
                  )}

                  {localInfo._debug.infrastructure && (
                    <div className="debug-section">
                      <h4>インフラ情報検索</h4>
                      <p>検索クエリ数: {localInfo._debug.infrastructure.searchQueries?.length || 0}</p>
                      <p>総結果数: {localInfo._debug.infrastructure.totalResults || 0}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        検証済み結果数: {localInfo._debug.infrastructure.searchLogs?.reduce((sum: number, log: any) => sum + (log.verifiedCount || 0), 0) || 0}
                      </p>
                      <details>
                        <summary>検索結果ログ</summary>
                        {localInfo._debug.infrastructure.searchLogs?.map((log: any, i: number) => (
                          <div key={i} style={{ marginBottom: '12px', padding: '8px', background: 'var(--bg-sidebar)', borderRadius: '4px' }}>
                            <p style={{ fontWeight: '600', fontSize: '12px' }}>クエリ: {log.query}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              結果数: {log.resultCount || 0} / 検証済み: {log.verifiedCount || log.results?.length || 0}
                            </p>
                            {log.results && log.results.length > 0 && (
                              <details style={{ marginTop: '4px' }}>
                                <summary style={{ fontSize: '11px', cursor: 'pointer' }}>結果詳細</summary>
                                {log.results.map((r: any, j: number) => (
                                  <div key={j} style={{ marginTop: '4px', padding: '4px', fontSize: '11px' }}>
                                    <p><strong>{r.title || 'タイトルなし'}</strong></p>
                                    <p style={{ color: 'var(--text-secondary)' }}>{r.description || '説明なし'}</p>
                                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: 'var(--primary)' }}>
                                      {r.url}
                                    </a>
                                  </div>
                                ))}
                              </details>
                            )}
                          </div>
                        ))}
                      </details>
                    </div>
                  )}

                  {localInfo._debug.traffic && (
                    <div className="debug-section">
                      <h4>トラフィック情報検索</h4>
                      <p>検索クエリ数: {localInfo._debug.traffic.searchQueries?.length || 0}</p>
                      <p>総結果数: {localInfo._debug.traffic.totalResults || 0}</p>
                      <details>
                        <summary>検索結果ログ</summary>
                        {localInfo._debug.traffic.searchLogs?.map((log: any, i: number) => (
                          <div key={i} style={{ marginBottom: '12px', padding: '8px', background: 'var(--bg-sidebar)', borderRadius: '4px' }}>
                            <p style={{ fontWeight: '600', fontSize: '12px' }}>クエリ: {log.query}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              結果数: {log.resultCount || 0} / 検証済み: {log.verifiedCount || log.results?.length || 0}
                            </p>
                            {log.results && log.results.length > 0 && (
                              <details style={{ marginTop: '4px' }}>
                                <summary style={{ fontSize: '11px', cursor: 'pointer' }}>結果詳細</summary>
                                {log.results.map((r: any, j: number) => (
                                  <div key={j} style={{ marginTop: '4px', padding: '4px', fontSize: '11px' }}>
                                    <p><strong>{r.title || 'タイトルなし'}</strong></p>
                                    <p style={{ color: 'var(--text-secondary)' }}>{r.description || '説明なし'}</p>
                                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: 'var(--primary)' }}>
                                      {r.url}
                                    </a>
                                  </div>
                                ))}
                              </details>
                            )}
                          </div>
                        ))}
                      </details>
                    </div>
                  )}
                  {localInfo._debug.weather && (
                    <div className="debug-section">
                      <h4>天気情報検索</h4>
                      <p>検索クエリ: {localInfo._debug.weather.searchQuery}</p>
                      <p>結果数: {localInfo._debug.weather.resultCount || 0} / 検証済み: {localInfo._debug.weather.verifiedCount || localInfo._debug.weather.searchResults?.length || 0}</p>
                      <details>
                        <summary>検索結果</summary>
                        {localInfo._debug.weather.searchResults?.map((r: any, i: number) => (
                          <div key={i} style={{ marginBottom: '8px', padding: '8px', background: 'var(--bg-sidebar)', borderRadius: '4px', fontSize: '12px' }}>
                            <p><strong>{r.title || 'タイトルなし'}</strong></p>
                            <p style={{ color: 'var(--text-secondary)' }}>{r.description || '説明なし'}</p>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--primary)' }}>
                              {r.url}
                            </a>
                          </div>
                        ))}
                      </details>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 分析セクション大見出し */}
            <div className="section-category-wrapper">
              <div className="section-category-header">
                <div className="section-category-accent"></div>
                <h3 className="section-category-title">
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                  分析
                </h3>
                <div className="section-category-accent"></div>
              </div>
            </div>

            <section className="analysis-section" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="section-header" style={{ order: 0 }}>
                <h2 className="section-title">
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                  企業分析 & 市場動向
                </h2>
                <div className="section-header-right">
                  <button 
                    className="refresh-btn" 
                    onClick={() => {
                      fetchSectionData('industry-trends', true)
                      fetchSectionData('swot-analysis', true)
                      fetchSectionData('world-news', true)
                      fetchSectionData('industry-forecast', true)
                    }}
                    disabled={refreshing['industry-trends'] || refreshing['swot-analysis'] || refreshing['world-news'] || refreshing['industry-forecast']}
                    title="全て更新"
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      className={(refreshing['industry-trends'] || refreshing['swot-analysis'] || refreshing['world-news'] || refreshing['industry-forecast']) ? 'spinning' : ''}
                      style={{ width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
                    >
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                    </svg>
                  </button>
                </div>
              </div>
              {/* 中段: 業界動向 + 業界予測 + 世界情勢（3カラム） */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px', order: 2 }}>
                <div id="industry-trends-section" className="analysis-card">
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--text-secondary)', fill: 'none', strokeWidth: 1.5 }}>
                        <path d="M18 20V10M12 20V4M6 20v-6"/>
                      </svg>
                      業界動向（{company?.industry || '業界'}）
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {industryTrends?.summary?.overallDirection && (
                        <span className={`badge ${industryTrends.summary.overallDirection === 'up' ? 'badge-success' : industryTrends.summary.overallDirection === 'down' ? 'badge-warning' : 'badge-info'}`}>
                          {industryTrends.summary.overallDirection === 'up' ? '↗️ 上昇傾向' : industryTrends.summary.overallDirection === 'down' ? '↘️ 下降傾向' : '→ 横ばい'}
                        </span>
                      )}
                      <button 
                        className="refresh-btn-small" 
                        onClick={() => fetchSectionData('industry-trends', true)}
                        disabled={refreshing['industry-trends']}
                        title="更新"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          className={refreshing['industry-trends'] ? 'spinning' : ''}
                          style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
                        >
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {industryTrends?.trends ? (
                    <div style={{ marginTop: '8px' }}>
                      {industryTrends.trends.slice(0, 5).map((trend, idx) => (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '10px 12px',
                          marginBottom: '6px',
                          background: 'var(--bg-main)',
                          borderRadius: '8px',
                          gap: '10px',
                          border: '1px solid var(--border)'
                        }}>
                          {/* 見やすいアイコン */}
                          <div style={{ 
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: trend.direction === 'up' ? 'linear-gradient(135deg, #10b981, #34d399)' : trend.direction === 'down' ? 'linear-gradient(135deg, #ef4444, #f87171)' : 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
                            flexShrink: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            <span style={{ fontSize: '16px', color: 'white', fontWeight: '700' }}>
                              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              marginBottom: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                              }}>{trend.title?.slice(0, 20) || trend.category}</span>
                              <span style={{ 
                                fontSize: '9px', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                background: trend.direction === 'up' ? 'rgba(16,185,129,0.15)' : trend.direction === 'down' ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.15)',
                                color: trend.direction === 'up' ? '#10b981' : trend.direction === 'down' ? '#ef4444' : '#64748b',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                              }}>
                                {trend.direction === 'up' ? '上昇' : trend.direction === 'down' ? '下降' : '横ばい'}
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: 'var(--text-secondary)', 
                              lineHeight: '1.5',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical' as const
                            }}>
                              {trend.description?.slice(0, 100) || '情報なし'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      読み込み中...
                    </div>
                  )}
                </div>
                {/* 業界予測（右側） */}
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title" style={{ fontSize: '12px' }}>
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--text-secondary)', fill: 'none', strokeWidth: 1.5 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      業界予測
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {industryForecast?.shortTerm?.outlook && (
                        <span className={`badge ${industryForecast.shortTerm.outlook === 'positive' ? 'badge-success' : industryForecast.shortTerm.outlook === 'negative' ? 'badge-warning' : 'badge-info'}`}>
                          {industryForecast.shortTerm.outlook === 'positive' ? '↗️ ポジティブ' : industryForecast.shortTerm.outlook === 'negative' ? '↘️ ネガティブ' : '→ 中立'}
                        </span>
                      )}
                      <button 
                        className="refresh-btn-small" 
                        onClick={() => fetchSectionData('industry-forecast', true)}
                        disabled={refreshing['industry-forecast']}
                        title="更新"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          className={refreshing['industry-forecast'] ? 'spinning' : ''}
                          style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
                        >
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {industryForecast ? (
                    <div style={{ marginTop: '8px' }}>
                      {industryForecast.indicators && industryForecast.indicators.length > 0 && (
                        <div>
                          {industryForecast.indicators.slice(0, 5).map((ind: ForecastIndicator, idx: number) => (
                            <div key={idx} style={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              padding: '10px 12px',
                              marginBottom: '8px',
                              background: 'var(--bg-main)',
                              borderRadius: '8px',
                              gap: '12px',
                              border: '1px solid var(--border)'
                            }}>
                              <div style={{ 
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: ind.trend === 'up' 
                                  ? 'linear-gradient(135deg, #10b981, #34d399)' 
                                  : ind.trend === 'down' 
                                    ? 'linear-gradient(135deg, #ef4444, #f87171)' 
                                    : 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
                                flexShrink: 0,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}>
                                <span style={{ fontSize: '16px', color: 'white', fontWeight: '700' }}>
                                  {ind.trend === 'up' ? '↑' : ind.trend === 'down' ? '↓' : '→'}
                                </span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '12px', 
                                  fontWeight: '600',
                                  color: 'var(--text-primary)',
                                  marginBottom: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  {ind.name}
                                  <span style={{ 
                                    fontSize: '10px', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px',
                                    background: ind.confidence === 'high' ? 'rgba(16,185,129,0.2)' : ind.confidence === 'medium' ? 'rgba(245,158,11,0.2)' : 'rgba(148,163,184,0.2)',
                                    color: ind.confidence === 'high' ? 'var(--success)' : ind.confidence === 'medium' ? 'var(--warning)' : 'var(--text-secondary)',
                                    fontWeight: '500'
                                  }}>
                                    信頼度{ind.confidence === 'high' ? '高' : ind.confidence === 'medium' ? '中' : '低'}
                                  </span>
                                </div>
                                <div style={{ 
                                  fontSize: '11px', 
                                  color: 'var(--text-secondary)',
                                  lineHeight: '1.6',
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical' as const
                                }}>
                                  {ind.forecast}{(ind as any).description && `。${(ind as any).description}`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      読み込み中...
                    </div>
                  )}
                </div>
                {/* 世界情勢・業界影響（3列目） */}
                <div id="world-news-section" className="analysis-card">
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title" style={{ fontSize: '12px' }}>
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--text-secondary)', fill: 'none', strokeWidth: 1.5 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                      </svg>
                      世界情勢
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        className="refresh-btn-small" 
                        onClick={() => fetchSectionData('world-news', true)}
                        disabled={refreshing['world-news']}
                        title="更新"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          className={refreshing['world-news'] ? 'spinning' : ''}
                          style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
                        >
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {worldNews?.categories ? (
                    <div style={{ marginTop: '8px' }}>
                      {worldNews.categories.slice(0, 5).map((cat, catIdx) => {
                        const firstItem = cat.items?.[0];
                        const direction = firstItem?.direction || 'neutral';
                        return (
                        <div key={catIdx} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '10px 12px',
                          marginBottom: '8px',
                          background: 'var(--bg-main)',
                          borderRadius: '8px',
                          gap: '12px',
                          border: '1px solid var(--border)'
                        }}>
                          <div style={{ 
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: direction === 'positive' 
                              ? 'linear-gradient(135deg, #10b981, #34d399)' 
                              : direction === 'negative' 
                                ? 'linear-gradient(135deg, #ef4444, #f87171)' 
                                : 'linear-gradient(135deg, #6366f1, #818cf8)',
                            flexShrink: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            {cat.category === 'economy' && (
                              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
                                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                              </svg>
                            )}
                            {cat.category === 'ai' && (
                              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
                                <rect x="4" y="4" width="16" height="16" rx="2"/>
                                <circle cx="9" cy="10" r="1" fill="white"/>
                                <circle cx="15" cy="10" r="1" fill="white"/>
                                <path d="M9 15h6"/>
                              </svg>
                            )}
                            {cat.category === 'it_tech' && (
                              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
                                <polyline points="16,18 22,12 16,6"/>
                                <polyline points="8,6 2,12 8,18"/>
                              </svg>
                            )}
                            {!['economy', 'ai', 'it_tech'].includes(cat.category) && (
                              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                              </svg>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                              {cat.title}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: 'var(--text-secondary)', 
                              lineHeight: '1.6',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical' as const
                            }}>
                              {cat.items?.[0]?.impact || '情報なし'}
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      読み込み中...
                    </div>
                  )}
                </div>
              </div>

              {/* 上段: SWOT分析（フル幅） */}
              <div style={{ marginBottom: '20px', order: 1 }}>
                <div id="swot-analysis-section" className="analysis-card" style={{ position: 'relative' }}>
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title" style={{ position: 'relative' }}>
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--text-secondary)', fill: 'none', strokeWidth: 1.5 }}>
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                      </svg>
                      SWOT分析（強み・弱み・機会・脅威の分析）
                      <button
                        className="info-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSwotInfoOpen(!swotInfoOpen)
                        }}
                        style={{
                          marginLeft: '6px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-secondary)',
                        }}
                        title="SWOT分析について"
                      >
                        <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4M12 8h.01"/>
                        </svg>
                      </button>
                    </h4>
                    {swotInfoOpen && (
                      <>
                        <div
                          style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                          }}
                          onClick={() => setSwotInfoOpen(false)}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: '0',
                            marginTop: '8px',
                            padding: '12px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 1000,
                            fontSize: '13px',
                            lineHeight: '1.6',
                            minWidth: '280px',
                            maxWidth: '400px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>SWOT分析とは</h5>
                          <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>
                            <strong>強み（Strengths）</strong>: 会社の優位性や技術力<br/>
                            <strong>弱み（Weaknesses）</strong>: 課題や改善点<br/>
                            <strong>機会（Opportunities）</strong>: 市場の成長機会<br/>
                            <strong>脅威（Threats）</strong>: 競合やリスク
                          </p>
                          <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-light)' }}>
                            外部情報とHP情報を基にAIが分析します
                          </p>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-warning">AI分析</span>
                      <button 
                        className="refresh-btn-small" 
                        onClick={() => fetchSectionData('swot-analysis', true)}
                        disabled={refreshing['swot-analysis']}
                        title="更新"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          className={refreshing['swot-analysis'] ? 'spinning' : ''}
                          style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
                        >
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {swotAnalysis ? (
                    <>
                      {/* SWOT 2x2 マトリックス */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gridTemplateRows: '1fr 1fr',
                        gap: '0',
                        position: 'relative',
                        background: '#fff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '2px solid #e2e8f0'
                      }}>
                        {/* 中央のクロスライン */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: 'linear-gradient(90deg, #10b981 0%, #10b981 50%, #f59e0b 50%, #f59e0b 100%)',
                          zIndex: 5
                        }} />
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          background: 'linear-gradient(180deg, #10b981 0%, #3b82f6 50%, #3b82f6 50%, #f59e0b 100%)',
                          zIndex: 5
                        }} />

                        {/* 中央のS/W/O/T文字 - 中心付近に離して配置 */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-130%, -130%)',
                          fontSize: '52px',
                          fontWeight: '200',
                          fontFamily: 'Georgia, serif',
                          fontStyle: 'italic',
                          color: '#10b981',
                          opacity: 0.25,
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}>S</div>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(30%, -130%)',
                          fontSize: '52px',
                          fontWeight: '200',
                          fontFamily: 'Georgia, serif',
                          fontStyle: 'italic',
                          color: '#ef4444',
                          opacity: 0.25,
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}>W</div>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-130%, 30%)',
                          fontSize: '52px',
                          fontWeight: '200',
                          fontFamily: 'Georgia, serif',
                          fontStyle: 'italic',
                          color: '#3b82f6',
                          opacity: 0.25,
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}>O</div>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(30%, 30%)',
                          fontSize: '52px',
                          fontWeight: '200',
                          fontFamily: 'Georgia, serif',
                          fontStyle: 'italic',
                          color: '#f59e0b',
                          opacity: 0.25,
                          pointerEvents: 'none',
                          zIndex: 4
                        }}>T</div>

                        {/* 強み (S) - 左上 */}
                        <div style={{ 
                          padding: '16px',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                          position: 'relative'
                        }}>
                          <div style={{ marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#059669' }}>Strengths</span>
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>— 自社の優位性・得意分野</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {swotAnalysis.strengths?.slice(0, 3).map((s, i) => {
                              const text = typeof s === 'string' ? s : s.point;
                              const isImportant = i === 0;
                              return (
                                <div key={i} style={{ 
                                  padding: '8px 10px',
                                  background: '#d1fae5',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  color: '#065f46',
                                  boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                                  position: 'relative',
                                  minWidth: '70px',
                                  maxWidth: '150px'
                                }}>
                                  {isImportant && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-6px',
                                      width: '16px',
                                      height: '16px',
                                      background: '#1e293b',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
                                    </div>
                                  )}
                                  {text.slice(0, 40)}{text.length > 40 ? '...' : ''}
                                </div>
                              );
                            }) || <div style={{ fontSize: '10px', color: '#64748b' }}>分析中...</div>}
                          </div>
                        </div>

                        {/* 弱み (W) - 右上 */}
                        <div style={{ 
                          padding: '16px',
                          background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                          position: 'relative'
                        }}>
                          <div style={{ marginBottom: '10px', textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626' }}>Weaknesses</span>
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>— 改善すべき課題</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {swotAnalysis.weaknesses?.slice(0, 3).map((w, i) => {
                              const text = typeof w === 'string' ? w : w.point;
                              const isImportant = i === 0;
                              return (
                                <div key={i} style={{ 
                                  padding: '8px 10px',
                                  background: '#fecaca',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  color: '#991b1b',
                                  boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                                  position: 'relative',
                                  minWidth: '70px',
                                  maxWidth: '150px'
                                }}>
                                  {isImportant && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-6px',
                                      width: '16px',
                                      height: '16px',
                                      background: '#1e293b',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
                                    </div>
                                  )}
                                  {text.slice(0, 40)}{text.length > 40 ? '...' : ''}
                                </div>
                              );
                            }) || <div style={{ fontSize: '10px', color: '#64748b' }}>分析中...</div>}
                          </div>
                        </div>

                        {/* 機会 (O) - 左下 */}
                        <div style={{ 
                          padding: '16px',
                          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                          position: 'relative'
                        }}>
                          <div style={{ marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>Opportunities</span>
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>— 成長のチャンス</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {swotAnalysis.opportunities?.slice(0, 3).map((o, i) => {
                              const text = typeof o === 'string' ? o : o.point;
                              const isImportant = i === 0;
                              return (
                                <div key={i} style={{ 
                                  padding: '8px 10px',
                                  background: '#bfdbfe',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  color: '#1e40af',
                                  boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                                  position: 'relative',
                                  minWidth: '70px',
                                  maxWidth: '150px'
                                }}>
                                  {isImportant && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-6px',
                                      width: '16px',
                                      height: '16px',
                                      background: '#1e293b',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
                                    </div>
                                  )}
                                  {text.slice(0, 40)}{text.length > 40 ? '...' : ''}
                                </div>
                              );
                            }) || <div style={{ fontSize: '10px', color: '#64748b' }}>分析中...</div>}
                          </div>
                        </div>

                        {/* 脅威 (T) - 右下 */}
                        <div style={{ 
                          padding: '16px',
                          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                          position: 'relative'
                        }}>
                          <div style={{ marginBottom: '10px', textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#d97706' }}>Threats</span>
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>— 外部からのリスク</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {swotAnalysis.threats?.slice(0, 3).map((t, i) => {
                              const text = typeof t === 'string' ? t : t.point;
                              const isImportant = i === 0;
                              return (
                                <div key={i} style={{ 
                                  padding: '8px 10px',
                                  background: '#fde68a',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  color: '#92400e',
                                  boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                                  position: 'relative',
                                  minWidth: '70px',
                                  maxWidth: '150px'
                                }}>
                                  {isImportant && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-6px',
                                      width: '16px',
                                      height: '16px',
                                      background: '#1e293b',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
                                    </div>
                                  )}
                                  {text.slice(0, 40)}{text.length > 40 ? '...' : ''}
                                </div>
                              );
                            }) || <div style={{ fontSize: '10px', color: '#64748b' }}>分析中...</div>}
                          </div>
                        </div>
                      </div>

                      {/* 想定競合企業 + SNS・口コミ評判（横並び） */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        {/* 想定競合企業分析 */}
                        {swotAnalysis.competitors && swotAnalysis.competitors.length > 0 && (
                          <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: '8px' }}>
                            <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                              🏢 想定競合企業
                            </h5>
                            <p style={{ margin: '0 0 10px 0', fontSize: '10px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                              ※製品・サービス・地域等から推測した想定企業です
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {swotAnalysis.competitors.slice(0, 3).map((c: Competitor, i: number) => (
                                <div key={i} style={{ 
                                  padding: '10px 12px', 
                                  background: 'var(--bg-card)', 
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  fontSize: '11px'
                                }}>
                                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                    {c.name}
                                    <span style={{ 
                                      marginLeft: '8px', 
                                      fontSize: '9px', 
                                      padding: '2px 6px', 
                                      background: 'rgba(99,102,241,0.1)', 
                                      color: '#6366f1',
                                      borderRadius: '4px'
                                    }}>想定</span>
                                  </div>
                                  <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>強み: {c.strength}</div>
                                  {c.reason && (
                                    <div style={{ color: 'var(--text-light)', fontSize: '10px' }}>理由: {c.reason}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* SNS・口コミ評判 */}
                        {swotAnalysis.reputation && (
                          <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}>💬</div>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>SNS・口コミ評判</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>総合: {swotAnalysis.reputation.overall}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ padding: '8px', background: 'rgba(16,185,129,0.08)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '12px' }}>↑</span> 良い評判
                                </div>
                                {swotAnalysis.reputation.positives?.slice(0, 5).map((p, i) => {
                                  const comment = typeof p === 'string' ? p : (typeof p === 'object' && p !== null && 'comment' in p ? String(p.comment) : '情報なし')
                                  return (
                                    <div key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '2px' }}>
                                      • {comment} <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '600' }}>[{i + 1}]</span>
                                    </div>
                                  )
                                })}
                              </div>
                              <div style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                                <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '12px' }}>↓</span> 改善点
                                </div>
                                {swotAnalysis.reputation.negatives?.slice(0, 5).map((n, i) => {
                                  const comment = typeof n === 'string' ? n : (typeof n === 'object' && n !== null && 'comment' in n ? String(n.comment) : '情報なし')
                                  return (
                                    <div key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '2px' }}>
                                      • {comment} <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>[{i + 6}]</span>
                                    </div>
                                  )
                                })}
                              </div>
                              {/* 出典一覧 */}
                              <div style={{ padding: '8px', background: 'rgba(100,116,139,0.05)', borderRadius: '6px', borderTop: '2px solid rgba(100,116,139,0.2)', marginTop: '4px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '6px' }}>
                                  【出典】
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {/* 1段目: [1]-[5] 良い評判の出典 */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {swotAnalysis.reputation.positives?.slice(0, 5).map((p, i) => {
                                      const source = typeof p === 'object' && p !== null && 'source' in p ? String(p.source) : '出典情報なし'
                                      return (
                                        <div key={`pos-${i}`} style={{ fontSize: '9px', color: 'var(--text-tertiary)', lineHeight: '1.1' }}>
                                          [{i + 1}] {source}
                                        </div>
                                      )
                                    })}
                                  </div>
                                  {/* 2段目: [6]-[10] 改善点の出典 */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {swotAnalysis.reputation.negatives?.slice(0, 5).map((n, i) => {
                                      const source = typeof n === 'object' && n !== null && 'source' in n ? String(n.source) : '出典情報なし'
                                      return (
                                        <div key={`neg-${i}`} style={{ fontSize: '9px', color: 'var(--text-tertiary)', lineHeight: '1.1' }}>
                                          [{i + 6}] {source}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : swotError ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                      borderRadius: '12px',
                      border: '1px solid #fecaca'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#dc2626',
                        marginBottom: '8px'
                      }}>
                        SWOT分析を作成できませんでした
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#991b1b',
                        marginBottom: '16px',
                        lineHeight: '1.5'
                      }}>
                        {swotError}
                      </div>
                      <button
                        onClick={() => {
                          setSwotError(null)
                          fetchSectionData('swot-analysis', true)
                        }}
                        disabled={refreshing['swot-analysis']}
                        style={{
                          padding: '8px 16px',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          className={refreshing['swot-analysis'] ? 'spinning' : ''}
                          style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}
                        >
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                        </svg>
                        再試行
                      </button>
                    </div>
                  ) : (
                    <div className="swot-grid">
                      <div className="swot-item strength">
                        <div className="swot-label">強み</div>
                        <div className="swot-content">読み込み中...</div>
                      </div>
                      <div className="swot-item weakness">
                        <div className="swot-label">弱み</div>
                        <div className="swot-content">読み込み中...</div>
                      </div>
                      <div className="swot-item opportunity">
                        <div className="swot-label">機会</div>
                        <div className="swot-content">読み込み中...</div>
                      </div>
                      <div className="swot-item threat">
                        <div className="swot-label">脅威</div>
                        <div className="swot-content">読み込み中...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </section>

            {/* 経営への提言 - フル幅セクション（最下段） */}
            {industryForecast && (
              <section 
                id="recommendation-section"
                style={{
                  marginTop: '32px',
                  padding: '0',
                  width: '100%'
                }}
              >
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
                  borderRadius: '16px',
                  padding: '0',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(99, 102, 241, 0.12)'
                }}>
                  {/* 装飾的なドットパターン背景 */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `radial-gradient(circle at 2px 2px, rgba(99, 102, 241, 0.06) 1px, transparent 0)`,
                    backgroundSize: '20px 20px',
                    pointerEvents: 'none'
                  }} />
                  {/* グロー効果 */}
                  <div style={{
                    position: 'absolute',
                    top: '-30%',
                    right: '-10%',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08), transparent 70%)',
                    pointerEvents: 'none'
                  }} />

                  {/* ヘッダー */}
                  <div style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                      </div>
                      <div>
                        <h2 style={{ color: '#1e293b', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                          AI経営サマリー
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>
                          業界見通し・リスク分析・経営提言
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = '/consulting/start'}
                      style={{
                        padding: '8px 14px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      AIに相談
                    </button>
                  </div>

                  {/* メインコンテンツ */}
                  <div style={{ padding: '20px 24px', position: 'relative', zIndex: 1 }}>
                    {/* 上段: 業界見通し & リスクレベル */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '16px', 
                      marginBottom: '20px' 
                    }}>
                      {/* 業界見通しゲージ */}
                      <div style={{
                        background: 'rgba(99, 102, 241, 0.04)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(99, 102, 241, 0.08)'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', fontWeight: '600' }}>
                          📊 業界見通し
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          {/* 円形ゲージ */}
                          <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="3" />
                              <circle 
                                cx="18" cy="18" r="15" fill="none" 
                                stroke={industryForecast.shortTerm?.outlook === 'positive' ? '#10b981' : industryForecast.shortTerm?.outlook === 'negative' ? '#ef4444' : '#f59e0b'}
                                strokeWidth="3" 
                                strokeDasharray={`${industryForecast.shortTerm?.outlook === 'positive' ? 75 : industryForecast.shortTerm?.outlook === 'negative' ? 30 : 50} 100`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div style={{ 
                              position: 'absolute', 
                              inset: 0, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '16px'
                            }}>
                              {industryForecast.shortTerm?.outlook === 'positive' ? '📈' : industryForecast.shortTerm?.outlook === 'negative' ? '📉' : '➡️'}
                            </div>
                          </div>
                          <div>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: '700', 
                              color: industryForecast.shortTerm?.outlook === 'positive' ? '#10b981' : industryForecast.shortTerm?.outlook === 'negative' ? '#ef4444' : '#f59e0b'
                            }}>
                              {industryForecast.shortTerm?.outlook === 'positive' ? 'ポジティブ' : industryForecast.shortTerm?.outlook === 'negative' ? 'ネガティブ' : '中立'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                              短期（{industryForecast.shortTerm?.period || '3ヶ月'}）
                            </div>
                          </div>
                        </div>
                        {/* 説明文3行 */}
                        <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.5' }}>
                          業界全体の短期見通しを示すゲージです。<br/>
                          市場動向・需要予測・競合状況を総合評価。<br/>
                          緑:好調 / 黄:横ばい / 赤:低調
                        </div>
                      </div>

                      {/* リスクレベル */}
                      <div style={{
                        background: 'rgba(99, 102, 241, 0.04)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(99, 102, 241, 0.08)'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', fontWeight: '600' }}>
                          ⚠️ リスク要因
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          {/* リスクバー */}
                          <div style={{ flex: 1 }}>
                            <div style={{
                              display: 'flex',
                              gap: '3px',
                              marginBottom: '8px'
                            }}>
                              {[1,2,3,4,5].map(level => {
                                const riskCount = industryForecast.risks?.length || 0
                                const riskLevel = riskCount === 0 ? 1 : Math.min(5, Math.max(1, riskCount))
                                return (
                                  <div key={level} style={{
                                    flex: 1,
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: level <= riskLevel
                                      ? level <= 2 ? '#10b981' : level <= 3 ? '#f59e0b' : '#ef4444'
                                      : 'rgba(99, 102, 241, 0.1)'
                                  }} />
                                )
                              })}
                            </div>
                            {(() => {
                              const riskCount = industryForecast.risks?.length || 0
                              const riskLevel = riskCount === 0 ? '未検出' : riskCount <= 2 ? '低リスク' : riskCount <= 3 ? '中リスク' : '高リスク'
                              const riskColor = riskCount === 0 ? '#94a3b8' : riskCount <= 2 ? '#10b981' : riskCount <= 3 ? '#f59e0b' : '#ef4444'
                              return (
                                <>
                                  <div style={{ fontSize: '13px', fontWeight: '700', color: riskColor }}>
                                    {riskLevel}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                    {riskCount === 0 ? 'リスク要因なし' : `${riskCount}件のリスク要因を検出`}
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </div>
                        {/* 説明文3行 */}
                        <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.5' }}>
                          業界分析で検出されたリスク要因の数。<br/>
                          経済変動・競合参入・規制変更等を評価。<br/>
                          0件:未検出 / 1-2件:低 / 3件:中 / 4件以上:高
                        </div>
                      </div>

                      {/* 成長機会 */}
                      <div style={{
                        background: 'rgba(99, 102, 241, 0.04)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(99, 102, 241, 0.08)'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', fontWeight: '600' }}>
                          🚀 成長機会
                        </div>
                        {(() => {
                          const oppCount = industryForecast.opportunities?.length || 0
                          return (
                            <>
                              <div style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: oppCount > 0 ? '#10b981' : '#94a3b8',
                                marginBottom: '4px'
                              }}>
                                {oppCount > 0 ? oppCount : '―'}
                              </div>
                              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '10px' }}>
                                {oppCount > 0 ? '件の成長機会を検出' : '分析データなし'}
                              </div>
                            </>
                          )
                        })()}
                        {/* 説明文3行 */}
                        <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.5' }}>
                          市場拡大・新規事業・技術革新等の機会数。<br/>
                          業界動向と自社の強みから機会を分析。<br/>
                          多いほど成長余地が大きいことを示します。
                        </div>
                      </div>
                    </div>

                    {/* 主要指標のミニチャート - フル幅 */}
                    {industryForecast.indicators && industryForecast.indicators.length > 0 && (
                      <div style={{
                        background: 'rgba(99, 102, 241, 0.04)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        marginBottom: '20px',
                        border: '1px solid rgba(99, 102, 241, 0.08)',
                        width: '100%'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#475569',
                          marginBottom: '6px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>📈 主要指標トレンド</span>
                          <span style={{ fontSize: '10px', fontWeight: '400', color: '#94a3b8' }}>業界分析に基づく傾向予測（イメージ図）</span>
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(5, 1fr)', 
                          gap: '8px',
                          width: '100%'
                        }}>
                          {industryForecast.indicators.slice(0, 5).map((ind: ForecastIndicator, idx: number) => (
                            <div key={idx} style={{
                              background: 'rgba(99, 102, 241, 0.06)',
                              borderRadius: '8px',
                              padding: '14px 10px',
                              textAlign: 'center'
                            }}>
                              {/* ミニスパークライン風 */}
                              <div style={{ 
                                height: '32px', 
                                display: 'flex', 
                                alignItems: 'flex-end', 
                                justifyContent: 'center',
                                gap: '3px',
                                marginBottom: '10px'
                              }}>
                                {[40, 55, 45, 60, 70, 65, 72, ind.trend === 'up' ? 90 : ind.trend === 'down' ? 25 : 55].map((h, i) => (
                                  <div key={i} style={{
                                    width: '6px',
                                    height: `${h * 0.32}px`,
                                    borderRadius: '3px',
                                    background: i === 7 
                                      ? (ind.trend === 'up' ? '#10b981' : ind.trend === 'down' ? '#ef4444' : '#f59e0b')
                                      : 'rgba(99, 102, 241, 0.2)'
                                  }} />
                                ))}
                              </div>
                              <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '600', marginBottom: '4px' }}>
                                {ind.name?.slice(0, 10) || '指標'}
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                color: ind.trend === 'up' ? '#10b981' : ind.trend === 'down' ? '#ef4444' : '#f59e0b',
                                fontWeight: '700'
                              }}>
                                {ind.trend === 'up' ? '↗ 上昇' : ind.trend === 'down' ? '↘ 下降' : '→ 横ばい'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 経営提言 - スマート版 */}
                    {industryForecast.recommendation && (
                      <div style={{
                        background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.06), rgba(99, 102, 241, 0.02))',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        border: '1px solid rgba(99, 102, 241, 0.12)',
                        marginBottom: '16px'
                      }}>
                        {/* ヘッダー - スマートでモダン */}
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)'
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
                                <path d="M9 21h6"/>
                              </svg>
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', letterSpacing: '0.3px' }}>
                                経営への提言
                                <span style={{ fontSize: '9px', fontWeight: '400', color: '#94a3b8', marginLeft: '6px' }}>(公開情報による提言)</span>
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500' }}>Strategic Recommendations</div>
                            </div>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(249, 115, 22, 0.08))',
                            border: '1px solid rgba(245, 158, 11, 0.25)'
                          }}>
                            <div style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: '#f59e0b',
                              boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)'
                            }} />
                            <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '600', letterSpacing: '0.5px' }}>PRIORITY</span>
                          </div>
                        </div>

                        {/* 提言リスト - SVGアイコン付きカード + タイムスケジュール */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {industryForecast.recommendation.split(/[。]/).filter(s => s.trim() && s.trim().length > 5).slice(0, 3).map((item, idx) => {
                            // 【カテゴリ】を抽出
                            const categoryMatch = item.match(/【(.+?)】/)
                            const category = categoryMatch ? categoryMatch[1] : ['業務効率化', '収益改善', 'リスク対策'][idx]
                            const cleanText = item.replace(/^[①②③]\s*/, '').replace(/【.+?】/, '').trim()

                            // 「：」で施策名とスケジュール詳細を分割
                            const colonIdx = cleanText.indexOf('：') !== -1 ? cleanText.indexOf('：') : cleanText.indexOf(':')
                            const actionTitle = colonIdx !== -1 ? cleanText.substring(0, colonIdx).trim() : cleanText
                            const scheduleDetail = colonIdx !== -1 ? cleanText.substring(colonIdx + 1).trim() : ''

                            // 期限を抽出してタイムスケジュールを計算
                            const now = new Date()
                            const currentYear = now.getFullYear()
                            const currentMonth = now.getMonth() + 1
                            const currentQuarter = Math.ceil(currentMonth / 3)

                            // テキストから期限を抽出
                            const monthMatch = item.match(/(\d{1,2})月/)
                            const yearMatch = item.match(/(\d{4})年/)

                            let targetYear = yearMatch ? parseInt(yearMatch[1]) : currentYear
                            let targetMonth = monthMatch ? parseInt(monthMatch[1]) : currentMonth + [3, 6, 9][idx]
                            if (targetMonth > 12) {
                              targetYear += Math.floor((targetMonth - 1) / 12)
                              targetMonth = ((targetMonth - 1) % 12) + 1
                            }

                            // 開始時期を施策ごとにずらす（重複しないように）
                            const startOffsets = [0, 1, 2] // 四半期オフセット
                            const startQuarter = currentQuarter + startOffsets[idx]
                            const startYear = currentYear + Math.floor((startQuarter - 1) / 4)
                            const adjustedStartQ = ((startQuarter - 1) % 4) + 1

                            // 開始四半期から適切な期間（2〜3四半期）を確保
                            const minDuration = [3, 2, 2][idx] // 施策ごとの最小期間（四半期数）

                            // 終了四半期と年を計算（開始四半期 + 期間 - 1）
                            const endQuarterOffset = currentQuarter - 1 + startOffsets[idx] + minDuration - 1
                            const endYear = currentYear + Math.floor(endQuarterOffset / 4)
                            const endQuarter = (endQuarterOffset % 4) + 1

                            // 終了月を計算（四半期の最終月: Q1=3月, Q2=6月, Q3=9月, Q4=12月）
                            const endMonth = endQuarter * 3

                            // 工数と体制の概算設定（施策の優先度に応じた目安値）
                            // ※実際の工数は要件定義後に精査が必要
                            const effortConfigs = [
                              { effort: '約80人日', support: '外部支援含む', phases: ['要件定義', '開発・導入', '展開・定着'] },
                              { effort: '約40人日', support: '社内対応可', phases: ['分析', '施策実行', '効果測定'] },
                              { effort: '約60人日', support: '一部外部支援', phases: ['現状把握', '対策立案', '実施・検証'] }
                            ]
                            const effortCfg = effortConfigs[idx]

                            const configs = [
                              { bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.04))', border: 'rgba(99, 102, 241, 0.2)', iconBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', accent: '#6366f1', barColor: '#6366f1', textColor: '#1e293b', shadow: 'rgba(99, 102, 241, 0.2)' },
                              { bg: 'linear-gradient(135deg, rgba(14, 165, 233, 0.06), rgba(6, 182, 212, 0.03))', border: 'rgba(14, 165, 233, 0.15)', iconBg: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', accent: '#0ea5e9', barColor: '#0ea5e9', textColor: '#334155', shadow: 'rgba(14, 165, 233, 0.15)' },
                              { bg: 'rgba(100, 116, 139, 0.04)', border: 'rgba(100, 116, 139, 0.12)', iconBg: 'linear-gradient(135deg, #475569, #64748b)', accent: '#64748b', barColor: '#64748b', textColor: '#475569', shadow: 'rgba(71, 85, 105, 0.1)' }
                            ];
                            const cfg = configs[idx];
                            const icons = [
                              <svg key="star" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
                              <svg key="trend" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
                              <svg key="shield" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                            ];

                            // 四半期ラベル生成（現在から4四半期分）
                            const quarters = Array.from({ length: 4 }, (_, i) => {
                              const q = ((currentQuarter - 1 + i) % 4) + 1
                              const y = currentYear + Math.floor((currentQuarter - 1 + i) / 4)
                              return { label: `${y}Q${q}`, year: y, quarter: q }
                            })

                            // バーの位置計算
                            const totalQuarters = 4
                            const startIdx = startOffsets[idx]
                            const durationQuarters = minDuration
                            const barLeft = (startIdx / totalQuarters) * 100
                            const barWidth = (Math.min(durationQuarters, totalQuarters - startIdx) / totalQuarters) * 100

                            return (
                              <div key={idx} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0',
                                padding: '16px',
                                background: cfg.bg,
                                borderRadius: '12px',
                                border: `1px solid ${cfg.border}`,
                                transition: 'all 0.25s ease'
                              }}>
                                {/* 上段: アイコン + 施策タイトル */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '10px' }}>
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: cfg.iconBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: `0 4px 12px ${cfg.shadow}`
                                  }}>{icons[idx]}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        color: cfg.accent,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.6px'
                                      }}>{category}</span>
                                      {idx === 0 && (
                                        <span style={{
                                          padding: '2px 7px',
                                          borderRadius: '4px',
                                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08))',
                                          border: '1px solid rgba(239, 68, 68, 0.25)',
                                          fontSize: '9px',
                                          color: '#ef4444',
                                          fontWeight: '700'
                                        }}>優先</span>
                                      )}
                                      <span style={{
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        background: effortCfg.support.includes('外部') ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                                        border: `1px solid ${effortCfg.support.includes('外部') ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                                        fontSize: '9px',
                                        color: effortCfg.support.includes('外部') ? '#d97706' : '#16a34a',
                                        fontWeight: '600'
                                      }}>{effortCfg.support}</span>
                                    </div>
                                    <p style={{
                                      margin: 0,
                                      fontSize: '13px',
                                      color: cfg.textColor,
                                      lineHeight: '1.5',
                                      fontWeight: '600'
                                    }}>{actionTitle}</p>
                                  </div>
                                </div>

                                {/* 中段: スケジュール詳細（改行表示） */}
                                {scheduleDetail && (
                                  <div style={{
                                    padding: '10px 14px',
                                    marginBottom: '12px',
                                    background: 'rgba(248, 250, 252, 0.6)',
                                    borderRadius: '8px',
                                    borderLeft: `3px solid ${cfg.accent}`
                                  }}>
                                    <p style={{
                                      margin: 0,
                                      fontSize: '12px',
                                      color: '#475569',
                                      lineHeight: '1.6'
                                    }}>{scheduleDetail}</p>
                                  </div>
                                )}

                                {/* 下段: 四半期ガントチャート */}
                                <div style={{
                                  background: 'rgba(248, 250, 252, 0.9)',
                                  borderRadius: '10px',
                                  padding: '12px 14px',
                                  border: '1px solid rgba(148, 163, 184, 0.12)'
                                }}>
                                  {/* ヘッダー: 工数情報 */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                                      実施スケジュール（概算）
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                                        想定工数: <strong style={{ color: cfg.accent }}>{effortCfg.effort}</strong>
                                        <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '4px' }}>※目安</span>
                                      </span>
                                    </div>
                                  </div>

                                  {/* 四半期軸 */}
                                  <div style={{ position: 'relative' }}>
                                    {/* 四半期ラベル */}
                                    <div style={{ display: 'flex', marginBottom: '6px' }}>
                                      {quarters.map((q, i) => (
                                        <div key={i} style={{
                                          flex: 1,
                                          textAlign: 'center',
                                          fontSize: '9px',
                                          color: '#94a3b8',
                                          fontWeight: '600'
                                        }}>{q.label}</div>
                                      ))}
                                    </div>

                                    {/* ガントバー背景 */}
                                    <div style={{
                                      display: 'flex',
                                      height: '28px',
                                      background: 'rgba(226, 232, 240, 0.5)',
                                      borderRadius: '6px',
                                      overflow: 'hidden',
                                      position: 'relative'
                                    }}>
                                      {/* 四半期区切り線 */}
                                      {[1, 2, 3].map(i => (
                                        <div key={i} style={{
                                          position: 'absolute',
                                          left: `${(i / 4) * 100}%`,
                                          top: 0,
                                          bottom: 0,
                                          width: '1px',
                                          background: 'rgba(148, 163, 184, 0.3)'
                                        }} />
                                      ))}

                                      {/* 実施バー */}
                                      <div style={{
                                        position: 'absolute',
                                        left: `${barLeft}%`,
                                        width: `${barWidth}%`,
                                        top: '4px',
                                        bottom: '4px',
                                        background: `linear-gradient(90deg, ${cfg.barColor}, ${cfg.barColor}dd)`,
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: `0 2px 6px ${cfg.shadow}`
                                      }}>
                                        <span style={{
                                          fontSize: '9px',
                                          color: 'white',
                                          fontWeight: '600',
                                          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          padding: '0 6px'
                                        }}>{effortCfg.phases.join(' → ')}</span>
                                      </div>
                                    </div>

                                    {/* 期間表示 */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9px', color: '#64748b' }}>
                                      <span>開始: {startYear}年Q{adjustedStartQ}</span>
                                      <span style={{ color: cfg.accent, fontWeight: '600' }}>完了: {endYear}年{endMonth}月</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* AI相談CTA - ガラスデザイン（右寄せ） */}
                        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                          <div
                            onClick={() => window.location.href = '/consulting/start'}
                            style={{
                              padding: '10px 14px',
                              background: 'rgba(255, 255, 255, 0.45)',
                              borderRadius: '10px',
                              border: '1px solid rgba(99, 102, 241, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              position: 'relative',
                              overflow: 'hidden',
                              transition: 'all 0.25s ease',
                              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.12), inset 0 1px 0 rgba(255,255,255,0.8)';
                              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.45)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.06), inset 0 1px 0 rgba(255,255,255,0.6)';
                              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.15)';
                            }}
                          >
                            {/* ガラス光沢 */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '50%',
                              background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                              pointerEvents: 'none',
                              borderRadius: '10px 10px 0 0'
                            }} />

                            {/* AIアイコン */}
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)',
                              position: 'relative',
                              zIndex: 1
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="white"/>
                              </svg>
                            </div>

                            {/* テキスト */}
                            <span style={{
                              fontSize: '12px',
                              color: '#4338ca',
                              fontWeight: '600',
                              position: 'relative',
                              zIndex: 1
                            }}>
                              AIに相談
                            </span>

                            {/* 矢印 */}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
                              <path d="M5 12h14"/>
                              <path d="M12 5l7 7-7 7"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 見通し・リスク要約 */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                      gap: '12px' 
                    }}>
                      {/* 見通し要約 */}
                      {industryForecast.shortTerm?.prediction && (
                        <div style={{
                          background: 'rgba(99, 102, 241, 0.04)',
                          borderRadius: '10px',
                          padding: '14px',
                          border: '1px solid rgba(99, 102, 241, 0.08)'
                        }}>
                          <div style={{ 
                            fontSize: '11px', 
                            color: industryForecast.shortTerm?.outlook === 'positive' ? '#10b981' : industryForecast.shortTerm?.outlook === 'negative' ? '#ef4444' : '#f59e0b',
                            marginBottom: '8px', 
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            📊 見通し
                          </div>
                          <p style={{
                            margin: 0,
                            fontSize: '11px',
                            color: '#475569',
                            lineHeight: '1.6'
                          }}>
                            {industryForecast.shortTerm.prediction.length > 200 
                              ? industryForecast.shortTerm.prediction.slice(0, 200) + '...' 
                              : industryForecast.shortTerm.prediction}
                          </p>
                        </div>
                      )}

                      {/* 中期見通し */}
                      {industryForecast.midTerm?.prediction && (
                        <div style={{
                          background: 'rgba(99, 102, 241, 0.04)',
                          borderRadius: '10px',
                          padding: '14px',
                          border: '1px solid rgba(99, 102, 241, 0.08)'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            color: industryForecast.midTerm?.outlook === 'positive' ? '#10b981' : industryForecast.midTerm?.outlook === 'negative' ? '#ef4444' : '#f59e0b',
                            marginBottom: '8px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            📅 中期見通し（{industryForecast.midTerm?.period || '6ヶ月'}）
                          </div>
                          <p style={{
                            margin: 0,
                            fontSize: '11px',
                            color: '#475569',
                            lineHeight: '1.6'
                          }}>
                            {industryForecast.midTerm.prediction.length > 200
                              ? industryForecast.midTerm.prediction.slice(0, 200) + '...'
                              : industryForecast.midTerm.prediction}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* 通知パネル */}
      <div className={`notifications-panel ${notificationsOpen ? 'open' : ''}`}>
        <div className="notifications-panel-header">
          <h3 className="notifications-panel-title">通知</h3>
          <button 
            className="notifications-close-btn"
            onClick={() => setNotificationsOpen(false)}
          >
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="notifications-empty">
              <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px', stroke: 'var(--text-light)', fill: 'none', strokeWidth: 1.5, marginBottom: '12px' }}>
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>通知はありません</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const timeAgo = (() => {
                const now = new Date()
                const diff = now.getTime() - notification.timestamp.getTime()
                const minutes = Math.floor(diff / (1000 * 60))
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                
                if (minutes < 1) return 'たった今'
                if (minutes < 60) return `${minutes}分前`
                if (hours < 24) return `${hours}時間前`
                return `${days}日前`
              })()

              const typeColors = {
                system: 'var(--text-secondary)',
                data: 'var(--primary)',
                action: 'var(--accent)',
                alert: 'var(--warning)'
              }

              return (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => {
                    if (notification.action) {
                      notification.action.onClick()
                    }
                  }}
                >
                  <div className="notification-icon" style={{ color: typeColors[notification.type] }}>
                    {notification.icon || (
                      notification.type === 'system' ? '🔧' :
                      notification.type === 'data' ? '📊' :
                      notification.type === 'action' ? '💬' : '⚠️'
                    )}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">{notification.title}</h4>
                      {!notification.read && <span className="notification-unread-dot"></span>}
                    </div>
                    <p className="notification-message">{notification.message}</p>
                    <div className="notification-footer">
                      <span className="notification-time">{timeAgo}</span>
                      {notification.action && (
                        <button 
                          className="notification-action-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            notification.action?.onClick()
                          }}
                        >
                          {notification.action.label}
                          <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        {notifications.length > 0 && (
          <div className="notifications-panel-footer">
            <button 
              className="notifications-mark-all-read"
              onClick={() => {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                setUnreadCount(0)
              }}
            >
              全て既読にする
            </button>
          </div>
        )}
      </div>

      {/* 通知パネルのオーバーレイ */}
      {notificationsOpen && (
        <div 
          className="notifications-overlay"
          onClick={() => setNotificationsOpen(false)}
        />
      )}

      {/* デバッグパネルのオーバーレイ */}
      {debugPanelOpen && (
        <div 
          className="notifications-overlay"
          onClick={() => setDebugPanelOpen(false)}
        />
      )}
    </>
      )
    }

