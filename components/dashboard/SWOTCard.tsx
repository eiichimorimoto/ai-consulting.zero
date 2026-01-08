'use client'

import { SWOTAnalysis } from './types'

interface SWOTCardProps {
  swotAnalysis: SWOTAnalysis | null
  swotError: string | null
  setSwotError: (error: string | null) => void
  swotInfoOpen: boolean
  setSwotInfoOpen: (open: boolean) => void
  refreshing: Record<string, boolean>
  fetchSectionData: (section: string, forceRefresh?: boolean) => void
}

export default function SWOTCard({
  swotAnalysis,
  swotError,
  setSwotError,
  swotInfoOpen,
  setSwotInfoOpen,
  refreshing,
  fetchSectionData
}: SWOTCardProps) {
  return (
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
          <div className="swot-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            {/* 強み */}
            <div className="swot-item strength" style={{ 
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
              borderRadius: '10px', 
              padding: '14px',
              border: '2px solid #22c55e',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)'
            }}>
              <div className="swot-label" style={{ 
                fontSize: '13px', 
                fontWeight: '700', 
                color: '#15803d',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                💪 強み
                <span style={{ 
                  fontSize: '10px', 
                  background: '#22c55e', 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  {swotAnalysis.strengths?.[0] ? (typeof swotAnalysis.strengths[0] === 'string' ? swotAnalysis.strengths[0].slice(0, 8) : swotAnalysis.strengths[0].point?.slice(0, 8)) : '分析中'}...
                </span>
              </div>
              <div className="swot-content" style={{ 
                fontSize: '11px', 
                color: '#166534', 
                lineHeight: '1.6',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {swotAnalysis.strengths?.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ 
                    marginBottom: '8px', 
                    paddingLeft: '12px', 
                    textIndent: '-12px',
                    wordBreak: 'break-word'
                  }}>
                    • {typeof s === 'string' ? s : s.point}
                  </div>
                )) || '分析中...'}
              </div>
            </div>
            
            {/* 弱み */}
            <div className="swot-item weakness" style={{ 
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
              borderRadius: '10px', 
              padding: '14px',
              border: '2px solid #f59e0b',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
            }}>
              <div className="swot-label" style={{ 
                fontSize: '13px', 
                fontWeight: '700', 
                color: '#b45309',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                ⚡ 弱み
                <span style={{ 
                  fontSize: '10px', 
                  background: '#f59e0b', 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  {swotAnalysis.weaknesses?.[0] ? (typeof swotAnalysis.weaknesses[0] === 'string' ? swotAnalysis.weaknesses[0].slice(0, 8) : swotAnalysis.weaknesses[0].point?.slice(0, 8)) : '分析中'}...
                </span>
              </div>
              <div className="swot-content" style={{ 
                fontSize: '11px', 
                color: '#92400e', 
                lineHeight: '1.6',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {swotAnalysis.weaknesses?.slice(0, 3).map((w, i) => (
                  <div key={i} style={{ 
                    marginBottom: '8px', 
                    paddingLeft: '12px', 
                    textIndent: '-12px',
                    wordBreak: 'break-word'
                  }}>
                    • {typeof w === 'string' ? w : w.point}
                  </div>
                )) || '分析中...'}
              </div>
            </div>
            
            {/* 機会 */}
            <div className="swot-item opportunity" style={{ 
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
              borderRadius: '10px', 
              padding: '14px',
              border: '2px solid #3b82f6',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)'
            }}>
              <div className="swot-label" style={{ 
                fontSize: '13px', 
                fontWeight: '700', 
                color: '#1d4ed8',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                🚀 機会
                <span style={{ 
                  fontSize: '10px', 
                  background: '#3b82f6', 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  {swotAnalysis.opportunities?.[0] ? (typeof swotAnalysis.opportunities[0] === 'string' ? swotAnalysis.opportunities[0].slice(0, 8) : swotAnalysis.opportunities[0].point?.slice(0, 8)) : '分析中'}...
                </span>
              </div>
              <div className="swot-content" style={{ 
                fontSize: '11px', 
                color: '#1e40af', 
                lineHeight: '1.6',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {swotAnalysis.opportunities?.slice(0, 3).map((o, i) => (
                  <div key={i} style={{ 
                    marginBottom: '8px', 
                    paddingLeft: '12px', 
                    textIndent: '-12px',
                    wordBreak: 'break-word'
                  }}>
                    • {typeof o === 'string' ? o : o.point}
                  </div>
                )) || '分析中...'}
              </div>
            </div>
            
            {/* 脅威 */}
            <div className="swot-item threat" style={{ 
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', 
              borderRadius: '10px', 
              padding: '14px',
              border: '2px solid #ef4444',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
            }}>
              <div className="swot-label" style={{ 
                fontSize: '13px', 
                fontWeight: '700', 
                color: '#dc2626',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                ⚠️ 脅威
                <span style={{ 
                  fontSize: '10px', 
                  background: '#ef4444', 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  {swotAnalysis.threats?.[0] ? (typeof swotAnalysis.threats[0] === 'string' ? swotAnalysis.threats[0].slice(0, 8) : swotAnalysis.threats[0].point?.slice(0, 8)) : '分析中'}...
                </span>
              </div>
              <div className="swot-content" style={{ 
                fontSize: '11px', 
                color: '#b91c1c', 
                lineHeight: '1.6',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {swotAnalysis.threats?.slice(0, 3).map((t, i) => (
                  <div key={i} style={{ 
                    marginBottom: '8px', 
                    paddingLeft: '12px', 
                    textIndent: '-12px',
                    wordBreak: 'break-word'
                  }}>
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
  )
}

