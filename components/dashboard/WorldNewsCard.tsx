'use client'

import { WorldNews } from './types'

interface WorldNewsCardProps {
  worldNews: WorldNews | null
  refreshing: Record<string, boolean>
  fetchSectionData: (section: string, forceRefresh?: boolean) => void
}

export default function WorldNewsCard({
  worldNews,
  refreshing,
  fetchSectionData
}: WorldNewsCardProps) {
  return (
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
  )
}

