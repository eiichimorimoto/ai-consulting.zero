'use client'

import { LocalInfo, Company } from './types'

interface LocalSectionProps {
  localInfo: LocalInfo | null
  company: Company | null
  refreshing: Record<string, boolean>
  lastUpdated: Record<string, string>
  fetchSectionData: (section: string, forceRefresh?: boolean) => void
  debugPanelOpen: boolean
  setDebugPanelOpen: (open: boolean) => void
}

export default function LocalSection({
  localInfo,
  company,
  refreshing,
  lastUpdated,
  fetchSectionData,
  debugPanelOpen,
  setDebugPanelOpen
}: LocalSectionProps) {
  return (
    <>
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
          {/* 労務費動向 */}
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
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>{company?.prefecture || '愛知県'}最低賃金:</span>{' '}
                {(localInfo?.laborCosts as any)?.comparison?.minimumWage?.toLocaleString() || '1,077'}円
                <span style={{ color: '#888', fontSize: '9px' }}>（2024年10月改定）</span>
              </div>
              <div style={{ background: '#f0f9ff', padding: '4px 6px', borderRadius: '4px', marginTop: '4px' }}>
                <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '2px' }}>
                  📊 {(localInfo?.laborCosts as any)?.comparison?.industryName || company?.industry || '製造業'}平均との比較
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>業界平均: {(localInfo?.laborCosts as any)?.comparison?.industryAverage?.toLocaleString() || '1,180'}円</span>
                  <span style={{ 
                    color: ((localInfo?.laborCosts as any)?.comparison?.vsIndustryAverage || 0) >= 0 ? '#16a34a' : '#dc2626',
                    fontWeight: 600
                  }}>
                    {((localInfo?.laborCosts as any)?.comparison?.vsIndustryAverage || 0) >= 0 ? '+' : ''}
                    {(localInfo?.laborCosts as any)?.comparison?.vsIndustryAverage || 0}円
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                  相場: {(localInfo?.laborCosts as any)?.comparison?.industryRange?.min?.toLocaleString() || '1,000'}〜
                  {(localInfo?.laborCosts as any)?.comparison?.industryRange?.max?.toLocaleString() || '1,500'}円
                </div>
              </div>
              <div style={{ fontSize: '8px', color: '#999', marginTop: '4px' }}>
                出典: {(localInfo?.laborCosts as any)?.dataSource?.minimumWage || '厚生労働省'}
              </div>
            </div>
          </div>

          {/* 注目イベント */}
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

          {/* インフラ情報 */}
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

          {/* 週間天気 */}
          <div className="local-card">
            <div className="local-card-header" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="local-icon weather">
                  <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: 1.5 }}>
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                </div>
                <span className="local-title">現在の天気</span>
              </div>
              {/* 日時を横に表示 */}
              <span style={{ 
                fontSize: '10px', 
                fontWeight: '500',
                color: 'var(--text-secondary)'
              }}>
                {localInfo?.weather?.displayTime || '取得中...'}
              </span>
            </div>
            {/* 場所を表示 */}
            <div style={{ 
              fontSize: '9px', 
              fontWeight: '500',
              color: 'var(--text-secondary)', 
              padding: '4px 12px',
              borderBottom: '1px solid var(--border)',
              marginBottom: '8px'
            }}>
              📍 {localInfo?.weather?.location || '東京都千代田区'}
            </div>
            <div className="local-weather-main">
              <span className="weather-icon">{localInfo?.weather?.current?.icon || '☀️'}</span>
              <div>
                <div className="weather-temp">
                  {localInfo?.weather?.current?.temp !== null && localInfo?.weather?.current?.temp !== undefined 
                    ? `${localInfo.weather.current.temp}°C` 
                    : '気温データ取得中...'}
                </div>
                <div className="weather-desc">
                  {localInfo?.weather?.current?.desc || 'データ取得中...'}
                </div>
              </div>
            </div>
            {/* 時間別予報 */}
            {localInfo?.weather?.hourly && localInfo.weather.hourly.length > 0 && (
              <div style={{ 
                display: 'flex', 
                gap: '6px', 
                marginBottom: '10px',
                paddingBottom: '10px',
                borderBottom: '1px solid var(--border)',
                overflowX: 'auto'
              }}>
                {localInfo.weather.hourly.slice(0, 6).map((hour, idx) => (
                  <div key={idx} style={{ 
                    minWidth: '45px',
                    textAlign: 'center',
                    padding: '6px 4px',
                    background: 'var(--bg-main)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{hour.time}</div>
                    <div style={{ fontSize: '16px', marginBottom: '2px' }}>{hour.icon}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>{hour.temp}°</div>
                  </div>
                ))}
              </div>
            )}
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
        <DebugPanel localInfo={localInfo} onClose={() => setDebugPanelOpen(false)} />
      )}
    </>
  )
}

// デバッグパネルコンポーネント
function DebugPanel({ localInfo, onClose }: { localInfo: LocalInfo; onClose: () => void }) {
  return (
    <div className="debug-panel">
      <div className="debug-panel-header">
        <h3>地域情報 デバッグ情報</h3>
        <button onClick={onClose}>×</button>
      </div>
      <div className="debug-panel-content">
        <div className="debug-section">
          <h4>検索エリア・業種</h4>
          <p>検索エリア: {localInfo._debug?.searchArea}</p>
          <p>業種: {(localInfo._debug as any)?.industry || '未設定'}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            検索時刻: {localInfo._debug?.searchTimestamp ? new Date(localInfo._debug.searchTimestamp).toLocaleString('ja-JP') : 'N/A'}
          </p>
          <p style={{ fontSize: '12px', color: localInfo._debug?.apiKeyConfigured ? 'var(--success)' : 'var(--danger)' }}>
            APIキー設定: {localInfo._debug?.apiKeyConfigured ? '✓ 設定済み' : '✗ 未設定'}
          </p>
        </div>

        {localInfo._debug?.laborCosts && (
          <div className="debug-section">
            <h4>労務費検索</h4>
            <p>検索クエリ数: {(localInfo._debug.laborCosts as any).searchQueries?.length || 0}</p>
            <details>
              <summary>検索クエリ一覧</summary>
              <ul>
                {(localInfo._debug.laborCosts as any).searchQueries?.map((q: string, i: number) => (
                  <li key={i} style={{ fontSize: '12px', marginBottom: '4px' }}>{q}</li>
                ))}
              </ul>
            </details>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              抽出された時給: {(localInfo._debug.laborCosts as any).extractedValue || 'N/A'}円
            </p>
          </div>
        )}

        {localInfo._debug?.events && (
          <div className="debug-section">
            <h4>イベント検索</h4>
            <p>検索クエリ: {(localInfo._debug.events as any).searchQuery}</p>
            <p>結果数: {(localInfo._debug.events as any).resultCount || 0}</p>
          </div>
        )}

        {localInfo._debug?.infrastructure && (
          <div className="debug-section">
            <h4>インフラ情報検索</h4>
            <p>検索クエリ数: {(localInfo._debug.infrastructure as any).searchQueries?.length || 0}</p>
            <p>総結果数: {(localInfo._debug.infrastructure as any).totalResults || 0}</p>
          </div>
        )}

        {localInfo._debug?.weather && (
          <div className="debug-section">
            <h4>天気情報検索</h4>
            <p>検索クエリ: {(localInfo._debug.weather as any).searchQuery}</p>
            <p>結果数: {(localInfo._debug.weather as any).resultCount || 0}</p>
            <p style={{ color: 'var(--primary)', fontWeight: '600' }}>
              抽出された気温: {(localInfo._debug.weather as any).extractedTemp !== null ? `${(localInfo._debug.weather as any).extractedTemp}°C` : '取得失敗'}
            </p>
            <p>降水確率: {(localInfo._debug.weather as any).extractedPrecipitation ? `${(localInfo._debug.weather as any).extractedPrecipitation}%` : 'N/A'}</p>
            <p>場所: {(localInfo._debug.weather as any).location || 'N/A'}</p>
            <p>取得時刻: {(localInfo._debug.weather as any).timestamp ? new Date((localInfo._debug.weather as any).timestamp).toLocaleString('ja-JP') : 'N/A'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

