'use client'

import { LineChart } from '../DashboardCharts'
import { MarketData, getWeekLabels } from './types'

interface MarketSectionProps {
  marketData: MarketData | null
  loading: boolean
  refreshing: Record<string, boolean>
  lastUpdated: Record<string, string>
  fetchSectionData: (section: string, forceRefresh?: boolean) => void
}

export default function MarketSection({
  marketData,
  loading,
  refreshing,
  lastUpdated,
  fetchSectionData
}: MarketSectionProps) {
  const weeks = getWeekLabels(8)

  return (
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
            {/* USD/JPY */}
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

            {/* 日経平均 */}
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

            {/* 長期金利 */}
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

            {/* 短期金利 */}
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
            
            {/* 原材料価格セクション */}
            {marketData?.commodities && (
              <div className="market-card" style={{ gridColumn: 'span 2' }}>
                <div className="market-card-header">
                  <span className="market-label">🛢️ 原材料価格（円換算）</span>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: '12px',
                  marginTop: '12px'
                }}>
                  {marketData.commodities.oil && (
                    <div style={{ 
                      background: 'var(--bg-main)', 
                      padding: '12px', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>原油(WTI)</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        ¥{marketData.commodities.oil.priceJpy?.toLocaleString() || '-'}
                      </div>
                      <div style={{ fontSize: '11px', color: marketData.commodities.oil.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {marketData.commodities.oil.change >= 0 ? '+' : ''}{marketData.commodities.oil.change?.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {marketData.commodities.steel && (
                    <div style={{ 
                      background: 'var(--bg-main)', 
                      padding: '12px', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>鉄鋼</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        ¥{marketData.commodities.steel.priceJpy?.toLocaleString() || '-'}
                      </div>
                      <div style={{ fontSize: '11px', color: marketData.commodities.steel.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {marketData.commodities.steel.change >= 0 ? '+' : ''}{marketData.commodities.steel.change?.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {marketData.commodities.copper && (
                    <div style={{ 
                      background: 'var(--bg-main)', 
                      padding: '12px', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>銅</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        ¥{marketData.commodities.copper.priceJpy?.toLocaleString() || '-'}
                      </div>
                      <div style={{ fontSize: '11px', color: marketData.commodities.copper.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {marketData.commodities.copper.change >= 0 ? '+' : ''}{marketData.commodities.copper.change?.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {marketData.commodities.aluminum && (
                    <div style={{ 
                      background: 'var(--bg-main)', 
                      padding: '12px', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>アルミ</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        ¥{marketData.commodities.aluminum.priceJpy?.toLocaleString() || '-'}
                      </div>
                      <div style={{ fontSize: '11px', color: marketData.commodities.aluminum.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {marketData.commodities.aluminum.change >= 0 ? '+' : ''}{marketData.commodities.aluminum.change?.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '8px', textAlign: 'right' }}>
                  ※ USD/JPY: ¥{marketData?.usdJpy?.[marketData.usdJpy.length - 1]?.value.toFixed(2) || '156.00'} で換算
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

