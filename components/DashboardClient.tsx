'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LineChart, IndustryChart } from './DashboardCharts'
import { useRouter } from 'next/navigation'
// HealthMonitorは削除（自動修復はバックグラウンドで実行、ユーザーには見せない）
import '../app/dashboard/dashboard.css'

interface Profile {
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

interface MarketData {
  usdJpy: { week: string; value: number }[]
  nikkei: { week: string; value: number }[]
  longRate: { week: string; value: number }[]
  shortRate: { week: string; value: number }[]
}

interface LocalInfo {
  laborCosts: {
    current: number
    change: number
    monthlyData: { month: string; value: number }[]
    sources: any[]
  }
  events: { title: string; url: string; description: string; date: string }[]
  infrastructure: { title: string; url: string; description: string; status: string }[]
  weather: {
    current: { temp: number; icon: string; desc: string }
    week: { day: string; date: string; icon: string; temp: number }[]
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
    positives: string[]
    negatives: string[]
    sources: string[]
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
  const [swotInfoOpen, setSwotInfoOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [debugPanelOpen, setDebugPanelOpen] = useState(false)
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
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': forceRefresh ? 'no-cache' : 'default'
        }
      })

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

  // 初回データ取得（ログイン後の初回セッションのみ）
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // セッションで初回かどうかをチェック
        const sessionKey = `dashboard_initialized_${profile?.id || 'guest'}`
        const isFirstLoad = !sessionStorage.getItem(sessionKey)
        
        if (isFirstLoad) {
          // 初回ログイン時は全データを取得
          await Promise.all([
            fetchSectionData('market'),
            fetchSectionData('local-info', true),
            fetchSectionData('industry-trends'),
            fetchSectionData('swot-analysis'),
            fetchSectionData('world-news'),
            fetchSectionData('industry-forecast'),
          ])
          // 初回フラグをセット
          sessionStorage.setItem(sessionKey, Date.now().toString())
        } else {
          // 初回以降はエリア情報のみ自動更新
          await fetchSectionData('local-info', true)
        }
      } catch (error) {
        console.error('Dashboard data fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [profile?.id])

  // 画面がアクティブになったときにエリア情報を更新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading) {
        // 画面がアクティブになったらエリア情報を更新
        fetchSectionData('local-info', true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loading])

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
              <a className="nav-item" onClick={() => router.push('/dashboard/ai-consultant')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                AIコンサルタント
              </a>
              <a className="nav-item" onClick={() => router.push('/dashboard/history')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6M9 16h6"/>
                </svg>
                相談履歴
                <span className="nav-badge">2</span>
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
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
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
            <div className="user-card">
              <div className="user-avatar">{getInitials(profile.name)}</div>
              <div>
                <div className="user-name">{profile.name}</div>
                <div className="user-role">{planName}</div>
              </div>
            </div>
          </div>
        </aside>
        <main className="main">
          <header className="header">
            <div className="header-left">
              <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <span></span><span></span><span></span>
              </button>
              <h1 className="page-title">ダッシュボード</h1>
            </div>
            <div className="header-right">
              <span className="current-time">{currentTime}</span>
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
          <div className="content">
            <section className="welcome-section">
              <div className="welcome-card">
                <div className="welcome-content">
                  <p className="welcome-greeting">おかえりなさい</p>
                  <h1 className="welcome-title">{profile.name}さん、今日もよろしくお願いします</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="company-badge">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      </svg>
                      {companyName}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                      {company?.industry || ''}{company?.industry && company?.prefecture ? ' / ' : ''}{company?.prefecture || ''}
                      {(company?.industry || company?.prefecture) && company?.employee_count ? ' / ' : ''}
                      {company?.employee_count ? `従業員: ${company.employee_count}` : ''}
                      {company?.employee_count && company?.annual_revenue ? ' / ' : ''}
                      {company?.annual_revenue ? `売上: ${company.annual_revenue}` : ''}
                    </span>
                  </div>
                </div>
                <div className="welcome-action">
                  <button 
                    onClick={() => router.push('/dashboard/ai-consultant')}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '24px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none', strokeWidth: 2.5 }}>
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    AIコンサルタントに相談
                  </button>
                </div>
              </div>
            </section>


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
                  </>
                )}
              </div>
            </section>

            <section className="action-section">
              <div className="action-grid">
                <div className="ai-card" onClick={() => router.push('/dashboard/chat')}>
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
                  <button className="ai-card-btn">
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
                  <button className="history-btn" onClick={() => router.push('/dashboard/history')}>
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
              <div className="local-grid">
                <div className="local-card">
                  <div className="local-card-header">
                    <div className="local-icon labor">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <span className="local-title">労務費動向</span>
                  </div>
                  <div className="local-highlight">
                    <span className="local-value">{localInfo?.laborCosts?.current?.toLocaleString() || '1,077'}</span>
                    <span className="local-unit">円/時</span>
                    <span className={`local-change ${(localInfo?.laborCosts?.change || 3.5) >= 0 ? 'up' : 'down'}`}>
                      {(localInfo?.laborCosts?.change || 3.5) >= 0 ? '+' : ''}{localInfo?.laborCosts?.change || 3.5}%
                    </span>
                  </div>
                  <div className="local-content" style={{ fontSize: '10px', lineHeight: '1.4' }}>
                    {/* 最低賃金情報 */}
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{company?.prefecture || '愛知県'}最低賃金:</span>{' '}
                      {localInfo?.laborCosts?.comparison?.minimumWage?.toLocaleString() || '1,077'}円
                      <span style={{ color: '#888', fontSize: '9px' }}>（2024年10月改定）</span>
                    </div>
                    {/* 同業種比較 */}
                    <div style={{ background: '#f0f9ff', padding: '4px 6px', borderRadius: '4px', marginTop: '4px' }}>
                      <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '2px' }}>
                        📊 {localInfo?.laborCosts?.comparison?.industryName || company?.industry || '製造業'}平均との比較
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>業界平均: {localInfo?.laborCosts?.comparison?.industryAverage?.toLocaleString() || '1,180'}円</span>
                        <span style={{ 
                          color: (localInfo?.laborCosts?.comparison?.vsIndustryAverage || 0) >= 0 ? '#16a34a' : '#dc2626',
                          fontWeight: 600
                        }}>
                          {(localInfo?.laborCosts?.comparison?.vsIndustryAverage || 0) >= 0 ? '+' : ''}
                          {localInfo?.laborCosts?.comparison?.vsIndustryAverage || 0}円
                        </span>
                      </div>
                      <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                        相場: {localInfo?.laborCosts?.comparison?.industryRange?.min?.toLocaleString() || '1,000'}〜
                        {localInfo?.laborCosts?.comparison?.industryRange?.max?.toLocaleString() || '1,500'}円
                      </div>
                    </div>
                    {/* データソース */}
                    <div style={{ fontSize: '8px', color: '#999', marginTop: '4px' }}>
                      出典: {localInfo?.laborCosts?.dataSource?.minimumWage || '厚生労働省'}
                    </div>
                  </div>
                </div>
                <div className="local-card">
                  <div className="local-card-header">
                    <div className="local-icon event">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                    </div>
                    <span className="local-title">注目イベント</span>
                  </div>
                  <div className="local-list">
                    {localInfo?.events && localInfo.events.length > 0 ? (
                      localInfo.events.slice(0, 3).map((event, idx) => (
                        <div key={idx} className="local-list-item">
                          <span className="local-list-dot"></span>
                          <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {event.title || `イベント${idx + 1}`} {event.date ? `(${event.date})` : ''}
                          </a>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="local-list-item">
                          <span className="local-list-dot"></span>
                          ものづくりワールド名古屋（1/22-24）
                        </div>
                        <div className="local-list-item">
                          <span className="local-list-dot"></span>
                          中部DXセミナー（1/30）
                        </div>
                        <div className="local-list-item">
                          <span className="local-list-dot"></span>
                          {company?.prefecture || '愛知県'}中小企業展（2/5-6）
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="local-card">
                  <div className="local-card-header">
                    <div className="local-icon infra">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                        <path d="M4 22v-7"/>
                      </svg>
                    </div>
                    <span className="local-title">インフラ情報</span>
                  </div>
                  <div className="local-list">
                    {localInfo?.infrastructure && localInfo.infrastructure.length > 0 ? (
                      localInfo.infrastructure.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="local-list-item">
                          <span 
                            className="local-list-dot" 
                            style={{ 
                              background: item.status === 'error' ? 'var(--danger)' : 
                                         item.status === 'warning' ? 'var(--warning)' : 
                                         'var(--success)' 
                            }}
                          ></span>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {item.title || `インフラ情報${idx + 1}`}
                          </a>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="local-list-item">
                          <span className="local-list-dot" style={{ background: 'var(--warning)' }}></span>
                          {company?.city || '名古屋市'}高速: 工事規制（〜1/15）
                        </div>
                        <div className="local-list-item">
                          <span className="local-list-dot" style={{ background: 'var(--success)' }}></span>
                          電力供給: 安定（予備率12%）
                        </div>
                        <div className="local-list-item">
                          <span className="local-list-dot" style={{ background: 'var(--success)' }}></span>
                          {company?.city || '名古屋市'}港: 通常運行
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="local-card">
                  <div className="local-card-header">
                    <div className="local-icon weather">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                        <circle cx="12" cy="12" r="5"/>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                      </svg>
                    </div>
                    <span className="local-title">週間天気</span>
                  </div>
                  <div className="local-weather-main">
                    <span className="weather-icon">{localInfo?.weather?.current?.icon || '☀️'}</span>
                    <div>
                      <div className="weather-temp">{localInfo?.weather?.current?.temp || 8}°C</div>
                      <div className="weather-desc">{localInfo?.weather?.current?.desc || '晴れ / 配送影響なし'}</div>
                    </div>
                  </div>
                  <div className="weather-week">
                    {localInfo?.weather?.week?.map((day, idx) => (
                      <div key={idx} className="weather-day">
                        <div className="weather-day-name">{day.day}</div>
                        <div className="weather-day-date" style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>{day.date}</div>
                        <div className="weather-day-icon">{day.icon}</div>
                      </div>
                    )) || (
                      <>
                        <div className="weather-day"><div className="weather-day-name">火</div><div className="weather-day-icon">☀️</div></div>
                        <div className="weather-day"><div className="weather-day-name">水</div><div className="weather-day-icon">⛅</div></div>
                        <div className="weather-day"><div className="weather-day-name">木</div><div className="weather-day-icon">🌧️</div></div>
                        <div className="weather-day"><div className="weather-day-name">金</div><div className="weather-day-icon">☀️</div></div>
                        <div className="weather-day"><div className="weather-day-name">土</div><div className="weather-day-icon">☀️</div></div>
                      </>
                    )}
                  </div>
                  {/* 異常気象アラート */}
                  {localInfo?.weather?.alerts && localInfo.weather.alerts.length > 0 && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '8px 10px', 
                      background: localInfo.weather.alerts[0].severity === 'extreme' 
                        ? 'rgba(239, 68, 68, 0.15)' 
                        : localInfo.weather.alerts[0].severity === 'severe'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(59, 130, 246, 0.15)',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${
                        localInfo.weather.alerts[0].severity === 'extreme' 
                          ? '#ef4444' 
                          : localInfo.weather.alerts[0].severity === 'severe'
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
                        color: localInfo.weather.alerts[0].severity === 'extreme' 
                          ? '#ef4444' 
                          : localInfo.weather.alerts[0].severity === 'severe'
                          ? '#f59e0b'
                          : '#3b82f6'
                      }}>
                        <span>{localInfo.weather.alerts[0].severity === 'extreme' ? '🚨' : localInfo.weather.alerts[0].severity === 'severe' ? '⚠️' : 'ℹ️'}</span>
                        {localInfo.weather.alerts[0].title}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {localInfo.weather.alerts[0].description}
                      </div>
                      {localInfo.weather.alerts.length > 1 && (
                        <div style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '4px' }}>
                          +{localInfo.weather.alerts.length - 1}件の気象警報
                        </div>
                      )}
                    </div>
                  )}
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

            <section className="analysis-section">
              <div className="section-header">
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
              <div className="analysis-grid">
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
                      {industryTrends.trends.slice(0, 6).map((trend, idx) => (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          padding: '10px',
                          marginBottom: '6px',
                          background: 'var(--bg-main)',
                          borderRadius: '6px',
                          gap: '10px'
                        }}>
                          <div style={{ 
                            fontSize: '20px',
                            lineHeight: '1',
                            color: trend.direction === 'up' ? 'var(--success)' : trend.direction === 'down' ? 'var(--danger)' : 'var(--text-secondary)'
                          }}>
                            {trend.direction === 'up' ? '↗️' : trend.direction === 'down' ? '↘️' : '→'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              marginBottom: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {trend.category}
                              <span style={{ 
                                fontSize: '10px', 
                                padding: '1px 6px', 
                                borderRadius: '4px',
                                background: trend.strength === 'strong' ? 'rgba(16,185,129,0.2)' : trend.strength === 'moderate' ? 'rgba(245,158,11,0.2)' : 'rgba(148,163,184,0.2)',
                                color: trend.strength === 'strong' ? 'var(--success)' : trend.strength === 'moderate' ? 'var(--warning)' : 'var(--text-secondary)'
                              }}>
                                {trend.strength === 'strong' ? '強' : trend.strength === 'moderate' ? '中' : '弱'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{trend.title}</div>
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
                      <div className="swot-grid">
                        <div className="swot-item strength">
                          <div className="swot-label">強み</div>
                          <div className="swot-content">
                            {swotAnalysis.strengths?.slice(0, 2).map((s, i) => (
                              <div key={i} style={{ marginBottom: '4px' }}>
                                • {typeof s === 'string' ? s : s.point}
                              </div>
                            )) || '分析中...'}
                          </div>
                        </div>
                        <div className="swot-item weakness">
                          <div className="swot-label">弱み</div>
                          <div className="swot-content">
                            {swotAnalysis.weaknesses?.slice(0, 2).map((w, i) => (
                              <div key={i} style={{ marginBottom: '4px' }}>
                                • {typeof w === 'string' ? w : w.point}
                              </div>
                            )) || '分析中...'}
                          </div>
                        </div>
                        <div className="swot-item opportunity">
                          <div className="swot-label">機会</div>
                          <div className="swot-content">
                            {swotAnalysis.opportunities?.slice(0, 2).map((o, i) => (
                              <div key={i} style={{ marginBottom: '4px' }}>
                                • {typeof o === 'string' ? o : o.point}
                              </div>
                            )) || '分析中...'}
                          </div>
                        </div>
                        <div className="swot-item threat">
                          <div className="swot-label">脅威</div>
                          <div className="swot-content">
                            {swotAnalysis.threats?.slice(0, 2).map((t, i) => (
                              <div key={i} style={{ marginBottom: '4px' }}>
                                • {typeof t === 'string' ? t : t.point}
                              </div>
                            )) || '分析中...'}
                          </div>
                        </div>
                      </div>
                      
                      {/* 競合企業分析 */}
                      {swotAnalysis.competitors && swotAnalysis.competitors.length > 0 && (
                        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px' }}>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            🏢 主要競合企業
                          </h5>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {swotAnalysis.competitors.slice(0, 3).map((c, i) => (
                              <div key={i} style={{ 
                                padding: '8px 12px', 
                                background: 'var(--bg-card)', 
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                fontSize: '12px',
                                flex: '1',
                                minWidth: '150px'
                              }}>
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{c.name}</div>
                                <div style={{ color: 'var(--text-secondary)' }}>{c.strength}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* SNS・口コミ評判 */}
                      {swotAnalysis.reputation && (
                        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px' }}>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            💬 SNS・口コミ評判
                          </h5>
                          <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '500' }}>総合評価: </span>
                            <span>{swotAnalysis.reputation.overall}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600', marginBottom: '4px' }}>👍 良い評判</div>
                              {swotAnalysis.reputation.positives?.slice(0, 2).map((p, i) => (
                                <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>• {p}</div>
                              ))}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '600', marginBottom: '4px' }}>👎 改善点</div>
                              {swotAnalysis.reputation.negatives?.slice(0, 2).map((n, i) => (
                                <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>• {n}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
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
                <div id="world-news-section" className="analysis-card">
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--text-secondary)', fill: 'none', strokeWidth: 1.5 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                      </svg>
                      世界情勢・業界影響
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-info">5カテゴリ</span>
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
                    <div className="news-list">
                      {worldNews.categories.map((cat, catIdx) => (
                        <div key={catIdx} style={{ marginBottom: '12px' }}>
                          <div style={{ 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            color: 'var(--text-secondary)',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {cat.category === 'it_tech' && '💻'}
                            {cat.category === 'ai' && '🤖'}
                            {cat.category === 'economy' && '📈'}
                            {cat.category === 'conflict' && '⚠️'}
                            {cat.category === 'software' && '📦'}
                            {cat.title}
                          </div>
                          {cat.items?.slice(0, 1).map((item, itemIdx) => (
                            <div key={itemIdx} className="news-item">
                              <span className={`news-tag ${item.direction === 'positive' ? 'economy' : item.direction === 'negative' ? 'policy' : 'market'}`}>
                                {item.direction === 'positive' ? '↗️ 好影響' : item.direction === 'negative' ? '↘️ 悪影響' : '→ 中立'}
                              </span>
                              <div className="news-content">
                                <div className="news-title">{item.headline}</div>
                                <div className="news-meta">{item.impact}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="news-list">
                      <div className="news-item">
                        <div className="news-content">
                          <div className="news-title">読み込み中...</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title">
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
                      {/* 主要指標 */}
                      {industryForecast.indicators && industryForecast.indicators.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>📊 主要指標予測</div>
                          {industryForecast.indicators.slice(0, 5).map((ind, idx) => (
                            <div key={idx} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              padding: '6px 8px',
                              marginBottom: '4px',
                              background: 'var(--bg-main)',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              <span style={{ 
                                fontSize: '14px', 
                                marginRight: '8px',
                                color: ind.trend === 'up' ? 'var(--success)' : ind.trend === 'down' ? 'var(--danger)' : 'var(--text-secondary)'
                              }}>
                                {ind.trend === 'up' ? '↗️' : ind.trend === 'down' ? '↘️' : '→'}
                              </span>
                              <span style={{ flex: 1 }}>{ind.name}</span>
                              <span style={{ fontWeight: '600', marginRight: '8px' }}>{ind.forecast}</span>
                              <span style={{ 
                                fontSize: '10px', 
                                padding: '1px 4px', 
                                borderRadius: '3px',
                                background: ind.confidence === 'high' ? 'rgba(16,185,129,0.2)' : ind.confidence === 'medium' ? 'rgba(245,158,11,0.2)' : 'rgba(148,163,184,0.2)'
                              }}>
                                {ind.confidence === 'high' ? '高' : ind.confidence === 'medium' ? '中' : '低'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* 経営提言は最下段のフル幅セクションに移動 */}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      読み込み中...
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
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                  borderRadius: '16px',
                  padding: '0',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* 装飾的なグリッド背景 */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                    pointerEvents: 'none'
                  }} />

                  {/* ヘッダー */}
                  <div style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
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
                        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)'
                      }}>💡</div>
                      <div>
                        <h2 style={{ color: 'white', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                          AI経営サマリー
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: 0 }}>
                          業界見通し・リスク分析・経営提言
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/dashboard/ai-consultant')}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                        e.currentTarget.style.color = 'white'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      AIコンサルタントに相談
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
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', fontWeight: '600' }}>
                          📊 業界見通し
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* 円形ゲージ */}
                          <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
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
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                              短期（{industryForecast.shortTerm?.period || '3ヶ月'}）
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* リスクレベル */}
                      <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', fontWeight: '600' }}>
                          ⚠️ リスクレベル
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* リスクバー */}
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              display: 'flex', 
                              gap: '3px', 
                              marginBottom: '8px' 
                            }}>
                              {[1,2,3,4,5].map(level => (
                                <div key={level} style={{
                                  flex: 1,
                                  height: '8px',
                                  borderRadius: '4px',
                                  background: level <= (industryForecast.risks?.length || 2) 
                                    ? level <= 2 ? '#10b981' : level <= 3 ? '#f59e0b' : '#ef4444'
                                    : 'rgba(255,255,255,0.1)'
                                }} />
                              ))}
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              fontWeight: '700', 
                              color: (industryForecast.risks?.length || 2) <= 2 ? '#10b981' : (industryForecast.risks?.length || 2) <= 3 ? '#f59e0b' : '#ef4444'
                            }}>
                              {(industryForecast.risks?.length || 2) <= 2 ? '低リスク' : (industryForecast.risks?.length || 2) <= 3 ? '中リスク' : '高リスク'}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                              {industryForecast.risks?.length || 0}件のリスク要因
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 成長機会 */}
                      <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', fontWeight: '600' }}>
                          🚀 成長機会
                        </div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '700', 
                          color: '#10b981',
                          marginBottom: '4px'
                        }}>
                          {industryForecast.opportunities?.length || 3}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                          件の成長機会を検出
                        </div>
                      </div>
                    </div>

                    {/* 主要指標のミニチャート */}
                    {industryForecast.indicators && industryForecast.indicators.length > 0 && (
                      <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', fontWeight: '600' }}>
                          📈 主要指標トレンド
                        </div>
                        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {industryForecast.indicators.slice(0, 5).map((ind, idx) => (
                            <div key={idx} style={{
                              minWidth: '120px',
                              background: 'rgba(255,255,255,0.05)',
                              borderRadius: '8px',
                              padding: '12px',
                              textAlign: 'center'
                            }}>
                              {/* ミニスパークライン風 */}
                              <div style={{ 
                                height: '24px', 
                                display: 'flex', 
                                alignItems: 'flex-end', 
                                justifyContent: 'center',
                                gap: '2px',
                                marginBottom: '8px'
                              }}>
                                {[40, 55, 45, 60, 70, 65, ind.trend === 'up' ? 85 : ind.trend === 'down' ? 30 : 50].map((h, i) => (
                                  <div key={i} style={{
                                    width: '4px',
                                    height: `${h * 0.24}px`,
                                    borderRadius: '2px',
                                    background: i === 6 
                                      ? (ind.trend === 'up' ? '#10b981' : ind.trend === 'down' ? '#ef4444' : '#f59e0b')
                                      : 'rgba(255,255,255,0.2)'
                                  }} />
                                ))}
                              </div>
                              <div style={{ fontSize: '11px', color: 'white', fontWeight: '600', marginBottom: '2px' }}>
                                {ind.name?.slice(0, 8) || '指標'}
                              </div>
                              <div style={{ 
                                fontSize: '10px', 
                                color: ind.trend === 'up' ? '#10b981' : ind.trend === 'down' ? '#ef4444' : '#f59e0b',
                                fontWeight: '600'
                              }}>
                                {ind.trend === 'up' ? '↗ 上昇' : ind.trend === 'down' ? '↘ 下降' : '→ 横ばい'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 経営提言 */}
                    {industryForecast.recommendation && (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(6, 182, 212, 0.1))',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(14, 165, 233, 0.3)',
                        marginBottom: '16px'
                      }}>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#0ea5e9', 
                          marginBottom: '12px', 
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{ fontSize: '14px' }}>💡</span>
                          経営への提言
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                          gap: '10px' 
                        }}>
                          {industryForecast.recommendation.split(/[。]/).filter(s => s.trim() && s.trim().length > 5).slice(0, 6).map((item, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              padding: '10px 12px',
                              background: 'rgba(255,255,255,0.9)',
                              borderRadius: '8px'
                            }}>
                              <span style={{
                                background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: '700',
                                flexShrink: 0
                              }}>{idx + 1}</span>
                              <p style={{
                                margin: 0,
                                fontSize: '12px',
                                color: '#1e293b',
                                lineHeight: '1.5',
                                fontWeight: '500'
                              }}>{item.trim()}</p>
                            </div>
                          ))}
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
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '10px',
                          padding: '14px',
                          border: '1px solid rgba(255,255,255,0.08)'
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
                            color: 'rgba(255,255,255,0.7)',
                            lineHeight: '1.6'
                          }}>
                            {industryForecast.shortTerm.prediction.length > 200 
                              ? industryForecast.shortTerm.prediction.slice(0, 200) + '...' 
                              : industryForecast.shortTerm.prediction}
                          </p>
                        </div>
                      )}

                      {/* リスク要約 */}
                      {industryForecast.midTerm?.prediction && (
                        <div style={{
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '10px',
                          padding: '14px',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          <div style={{ 
                            fontSize: '11px', 
                            color: (industryForecast.risks?.length || 2) <= 2 ? '#10b981' : (industryForecast.risks?.length || 2) <= 3 ? '#f59e0b' : '#ef4444',
                            marginBottom: '8px', 
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            {(industryForecast.risks?.length || 2) <= 2 ? '🟢' : (industryForecast.risks?.length || 2) <= 3 ? '🟡' : '🔴'} リスクレベル: {(industryForecast.risks?.length || 2) <= 2 ? '低' : (industryForecast.risks?.length || 2) <= 3 ? '中' : '高'}
                          </div>
                          <p style={{
                            margin: 0,
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.7)',
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

