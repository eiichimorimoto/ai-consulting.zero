'use client'

import { useRouter } from 'next/navigation'
import { IndustryForecast } from './types'

interface RecommendationSectionProps {
  industryForecast: IndustryForecast | null
}

export default function RecommendationSection({
  industryForecast
}: RecommendationSectionProps) {
  const router = useRouter()
  
  if (!industryForecast) return null

  return (
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
  )
}

