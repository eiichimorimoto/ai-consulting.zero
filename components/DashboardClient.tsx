'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LineChart, IndustryChart } from './DashboardCharts'
import { useRouter } from 'next/navigation'
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

export default function DashboardClient({ profile, company, subscription }: DashboardClientProps) {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const weeks = getWeekLabels(8)

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

  const getInitials = (name: string) => {
    const cleanName = name.replace(/\s+/g, '')
    return cleanName.length >= 2 ? cleanName.slice(0, 2) : cleanName.slice(0, 1)
  }

  const companyName = company?.name || '株式会社サンプル工業'
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
              <a className="nav-item" onClick={() => router.push('/dashboard/chat')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
                </svg>
                AIに相談
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
              <a className="nav-item" onClick={() => router.push('/dashboard/market')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                マーケット概況
              </a>
              <a className="nav-item" onClick={() => router.push('/dashboard/local')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                地域情報
              </a>
              <a className="nav-item" onClick={() => router.push('/dashboard/world')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                世界情勢
              </a>
            </div>
            <div className="nav-section">
              <div className="nav-section-title">分析</div>
              <a className="nav-item" onClick={() => router.push('/dashboard/industry')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
                業界動向
              </a>
              <a className="nav-item" onClick={() => router.push('/dashboard/company-analysis')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                </svg>
                企業分析
              </a>
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
              <a className="nav-item" onClick={() => router.push('/dashboard/billing')}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <rect x="1" y="4" width="22" height="16" rx="2"/>
                  <path d="M1 10h22"/>
                </svg>
                お支払い
              </a>
            </div>
          </nav>
          <div className="sidebar-footer">
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
              <button className="header-btn">
                <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                <span className="notification-dot"></span>
              </button>
            </div>
          </header>
          <div className="content">
            <section className="welcome-section">
              <div className="welcome-card">
                <div className="welcome-content">
                  <p className="welcome-greeting">おかえりなさい</p>
                  <h1 className="welcome-title">{profile.name}さん、今日もよろしくお願いします</h1>
                  <div className="company-badge">
                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    </svg>
                    {companyName}
                  </div>
                </div>
                <div className="welcome-action">
                  <button className="btn-ai-chat" onClick={() => router.push('/dashboard/chat')}>
                    <span className="ai-icon">
                      <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                      </svg>
                    </span>
                    AIに相談する
                  </button>
                </div>
              </div>
            </section>

            <section className="market-section">
              <div className="section-header">
                <h2 className="section-title">
                  <svg viewBox="0 0 24 24">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  マーケット概況
                </h2>
                <span className="update-time">5分前更新</span>
              </div>
              <div className="market-grid">
                <div className="market-card">
                  <div className="market-card-header">
                    <span className="market-label">USD/JPY</span>
                    <span className="market-change up">+0.32%</span>
                  </div>
                  <div className="market-value">¥156.42</div>
                  <div className="chart-container">
                    <LineChart
                      canvasId="chartUsdJpy"
                      tooltipId="tooltipUsdJpy"
                      data={[
                        { value: 154.20, week: weeks[0] }, { value: 153.85, week: weeks[1] }, { value: 155.10, week: weeks[2] },
                        { value: 154.75, week: weeks[3] }, { value: 156.20, week: weeks[4] }, { value: 155.80, week: weeks[5] },
                        { value: 156.85, week: weeks[6] }, { value: 156.42, week: weeks[7] }
                      ]}
                      options={{ prefix: '¥', lineColor: '#6366F1' }}
                    />
                  </div>
                </div>
                <div className="market-card">
                  <div className="market-card-header">
                    <span className="market-label">日経平均</span>
                    <span className="market-change up">+1.24%</span>
                  </div>
                  <div className="market-value">¥39,847</div>
                  <div className="chart-container">
                    <LineChart
                      canvasId="chartNikkei"
                      tooltipId="tooltipNikkei"
                      data={[
                        { value: 38200, week: weeks[0] }, { value: 38650, week: weeks[1] }, { value: 38100, week: weeks[2] },
                        { value: 39200, week: weeks[3] }, { value: 38900, week: weeks[4] }, { value: 39500, week: weeks[5] },
                        { value: 39950, week: weeks[6] }, { value: 39847, week: weeks[7] }
                      ]}
                      options={{ prefix: '¥', lineColor: '#10B981' }}
                    />
                  </div>
                </div>
                <div className="market-card">
                  <div className="market-card-header">
                    <span className="market-label">長期金利（10年）</span>
                    <span className="market-change down">-0.05%</span>
                  </div>
                  <div className="market-value">1.085%</div>
                  <div className="chart-container">
                    <LineChart
                      canvasId="chartLongRate"
                      tooltipId="tooltipLongRate"
                      data={[
                        { value: 1.12, week: weeks[0] }, { value: 1.15, week: weeks[1] }, { value: 1.10, week: weeks[2] },
                        { value: 1.08, week: weeks[3] }, { value: 1.11, week: weeks[4] }, { value: 1.09, week: weeks[5] },
                        { value: 1.10, week: weeks[6] }, { value: 1.085, week: weeks[7] }
                      ]}
                      options={{ unit: '%', lineColor: '#EF4444' }}
                    />
                  </div>
                </div>
                <div className="market-card">
                  <div className="market-card-header">
                    <span className="market-label">短期金利</span>
                    <span className="market-change up">+0.10%</span>
                  </div>
                  <div className="market-value">0.25%</div>
                  <div className="chart-container">
                    <LineChart
                      canvasId="chartShortRate"
                      tooltipId="tooltipShortRate"
                      data={[
                        { value: 0.10, week: weeks[0] }, { value: 0.10, week: weeks[1] }, { value: 0.15, week: weeks[2] },
                        { value: 0.15, week: weeks[3] }, { value: 0.20, week: weeks[4] }, { value: 0.20, week: weeks[5] },
                        { value: 0.25, week: weeks[6] }, { value: 0.25, week: weeks[7] }
                      ]}
                      options={{ unit: '%', lineColor: '#F59E0B' }}
                    />
                  </div>
                </div>
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

            <section className="local-section">
              <div className="section-header">
                <h2 className="section-title">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {company?.prefecture || '名古屋'}エリア情報
                </h2>
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
                    <span className="local-value">1,077</span>
                    <span className="local-unit">円/時</span>
                    <span className="local-change up">+3.5%</span>
                  </div>
                  <div className="local-content">
                    {company?.prefecture || '愛知県'}最低賃金（10月改定）<br/>
                    製造業求人倍率: 1.82倍
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
                    <div className="local-list-item">
                      <span className="local-list-dot" style={{ background: 'var(--warning)' }}></span>
                      {company?.prefecture || '名古屋'}高速: 工事規制（〜1/15）
                    </div>
                    <div className="local-list-item">
                      <span className="local-list-dot" style={{ background: 'var(--success)' }}></span>
                      電力供給: 安定（予備率12%）
                    </div>
                    <div className="local-list-item">
                      <span className="local-list-dot" style={{ background: 'var(--success)' }}></span>
                      {company?.prefecture || '名古屋'}港: 通常運行
                    </div>
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
                    <span className="weather-icon">☀️</span>
                    <div>
                      <div className="weather-temp">8°C</div>
                      <div className="weather-desc">晴れ / 配送影響なし</div>
                    </div>
                  </div>
                  <div className="weather-week">
                    <div className="weather-day"><div className="weather-day-name">火</div><div className="weather-day-icon">☀️</div></div>
                    <div className="weather-day"><div className="weather-day-name">水</div><div className="weather-day-icon">⛅</div></div>
                    <div className="weather-day"><div className="weather-day-name">木</div><div className="weather-day-icon">🌧️</div></div>
                    <div className="weather-day"><div className="weather-day-name">金</div><div className="weather-day-icon">☀️</div></div>
                    <div className="weather-day"><div className="weather-day-name">土</div><div className="weather-day-icon">☀️</div></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="company-section">
              <div className="section-header">
                <h2 className="section-title">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  </svg>
                  企業プロファイル
                </h2>
                <span className="badge badge-info">WEB情報取得済</span>
              </div>
              <div className="company-profile">
                <div className="profile-logo">{companyInitial}</div>
                <div className="profile-main">
                  <h3 className="profile-name">{companyName}</h3>
                  <p className="profile-industry">
                    {company?.industry || '製造業'} / {company?.industry || '機械部品・精密加工'} / {company?.prefecture || '名古屋'} / 創業{company?.established_date ? new Date().getFullYear() - new Date(company.established_date).getFullYear() : 35}年
                  </p>
                </div>
                <div className="profile-stats">
                  <div className="profile-stat">
                    <div className="profile-stat-value">{company?.employee_count || 48}</div>
                    <div className="profile-stat-label">従業員</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-value">{company?.annual_revenue ? `${(company.annual_revenue / 100000000).toFixed(1)}億` : '8.2億'}</div>
                    <div className="profile-stat-label">年間売上</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-value">120</div>
                    <div className="profile-stat-label">取引先</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-value">{company?.established_date ? new Date(company.established_date).getFullYear() : 1989}</div>
                    <div className="profile-stat-label">設立</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="analysis-section">
              <div className="section-header">
                <h2 className="section-title">
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                  企業分析 & 市場動向
                </h2>
              </div>
              <div className="analysis-grid">
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--text-secondary)', fill: 'none', strokeWidth: 1.5 }}>
                        <path d="M18 20V10M12 20V4M6 20v-6"/>
                      </svg>
                      業界動向（{company?.industry || '機械部品'}）
                    </h4>
                    <span className="badge badge-success">成長</span>
                  </div>
                  <div className="industry-chart-container">
                    <IndustryChart />
                  </div>
                  <div className="trend-legend">
                    <div className="trend-item">
                      <span className="trend-dot" style={{ background: 'var(--primary)' }}></span>
                      <span className="trend-label">国内需要</span>
                      <span className="trend-value" style={{ color: 'var(--success)' }}>+4.2%</span>
                    </div>
                    <div className="trend-item">
                      <span className="trend-dot" style={{ background: 'var(--accent)' }}></span>
                      <span className="trend-label">輸出</span>
                      <span className="trend-value" style={{ color: 'var(--success)' }}>+7.8%</span>
                    </div>
                  </div>
                </div>
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--text-secondary)', fill: 'none', strokeWidth: 1.5 }}>
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                      </svg>
                      SWOT分析
                    </h4>
                    <span className="badge badge-warning">AI分析</span>
                  </div>
                  <div className="swot-grid">
                    <div className="swot-item strength">
                      <div className="swot-label">強み</div>
                      <div className="swot-content">高精度加工技術、長年の取引実績</div>
                    </div>
                    <div className="swot-item weakness">
                      <div className="swot-label">弱み</div>
                      <div className="swot-content">デジタル化遅れ、後継者不足</div>
                    </div>
                    <div className="swot-item opportunity">
                      <div className="swot-label">機会</div>
                      <div className="swot-content">EV部品需要増、国内回帰トレンド</div>
                    </div>
                    <div className="swot-item threat">
                      <div className="swot-label">脅威</div>
                      <div className="swot-content">海外競合、原材料高騰</div>
                    </div>
                  </div>
                </div>
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--text-secondary)', fill: 'none', strokeWidth: 1.5 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                      </svg>
                      注目の世界情勢
                    </h4>
                    <span className="badge badge-info">業界関連</span>
                  </div>
                  <div className="news-list">
                    <div className="news-item">
                      <span className="news-tag economy">経済</span>
                      <div className="news-content">
                        <div className="news-title">米国製造業PMI、3ヶ月連続で拡大圏維持</div>
                        <div className="news-meta">2時間前 • Reuters</div>
                      </div>
                    </div>
                    <div className="news-item">
                      <span className="news-tag policy">政策</span>
                      <div className="news-content">
                        <div className="news-title">経産省、中小製造業向けDX支援を拡充へ</div>
                        <div className="news-meta">5時間前 • 日経</div>
                      </div>
                    </div>
                    <div className="news-item">
                      <span className="news-tag market">市場</span>
                      <div className="news-content">
                        <div className="news-title">自動車部品サプライチェーン、国内回帰が加速</div>
                        <div className="news-meta">昨日 • 日刊工業</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <h4 className="analysis-card-title">
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--text-secondary)', fill: 'none', strokeWidth: 1.5 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      業界予測（6ヶ月）
                    </h4>
                    <span className="badge badge-success">ポジティブ</span>
                  </div>
                  <div className="forecast-list">
                    <div className="forecast-item">
                      <div className="forecast-icon up">
                        <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'var(--success)', fill: 'none', strokeWidth: 1.5 }}>
                          <path d="M23 6l-9.5 9.5-5-5L1 18"/>
                          <path d="M17 6h6v6"/>
                        </svg>
                      </div>
                      <div className="forecast-info">
                        <div className="forecast-title">受注動向</div>
                        <div className="forecast-desc">自動車・半導体関連の回復継続</div>
                      </div>
                      <div className="forecast-value up">+12%</div>
                    </div>
                    <div className="forecast-item">
                      <div className="forecast-icon neutral">
                        <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'var(--warning)', fill: 'none', strokeWidth: 1.5 }}>
                          <path d="M5 12h14"/>
                        </svg>
                      </div>
                      <div className="forecast-info">
                        <div className="forecast-title">原材料価格</div>
                        <div className="forecast-desc">鉄鋼・非鉄は高止まり予想</div>
                      </div>
                      <div className="forecast-value neutral">横ばい</div>
                    </div>
                    <div className="forecast-item">
                      <div className="forecast-icon up">
                        <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'var(--success)', fill: 'none', strokeWidth: 1.5 }}>
                          <path d="M23 6l-9.5 9.5-5-5L1 18"/>
                          <path d="M17 6h6v6"/>
                        </svg>
                      </div>
                      <div className="forecast-info">
                        <div className="forecast-title">設備投資</div>
                        <div className="forecast-desc">自動化・省人化投資が活発化</div>
                      </div>
                      <div className="forecast-value up">+8%</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  )
}

