'use client'

import { Company, IndustryTrends, SWOTAnalysis, WorldNews, IndustryForecast } from './types'
import IndustryTrendsCard from './IndustryTrendsCard'
import SWOTCard from './SWOTCard'
import WorldNewsCard from './WorldNewsCard'
import ForecastCard from './ForecastCard'
import RecommendationSection from './RecommendationSection'

interface AnalysisSectionProps {
  company: Company | null
  industryTrends: IndustryTrends | null
  swotAnalysis: SWOTAnalysis | null
  swotError: string | null
  setSwotError: (error: string | null) => void
  swotInfoOpen: boolean
  setSwotInfoOpen: (open: boolean) => void
  worldNews: WorldNews | null
  industryForecast: IndustryForecast | null
  refreshing: Record<string, boolean>
  fetchSectionData: (section: string, forceRefresh?: boolean) => void
}

export default function AnalysisSection({
  company,
  industryTrends,
  swotAnalysis,
  swotError,
  setSwotError,
  swotInfoOpen,
  setSwotInfoOpen,
  worldNews,
  industryForecast,
  refreshing,
  fetchSectionData
}: AnalysisSectionProps) {
  return (
    <>
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
          <IndustryTrendsCard
            industryTrends={industryTrends}
            company={company}
            refreshing={refreshing}
            fetchSectionData={fetchSectionData}
          />
          <SWOTCard
            swotAnalysis={swotAnalysis}
            swotError={swotError}
            setSwotError={setSwotError}
            swotInfoOpen={swotInfoOpen}
            setSwotInfoOpen={setSwotInfoOpen}
            refreshing={refreshing}
            fetchSectionData={fetchSectionData}
          />
          <WorldNewsCard
            worldNews={worldNews}
            refreshing={refreshing}
            fetchSectionData={fetchSectionData}
          />
          <ForecastCard
            industryForecast={industryForecast}
            refreshing={refreshing}
            fetchSectionData={fetchSectionData}
          />
        </div>
      </section>

      {/* 経営への提言 - フル幅セクション（最下段） */}
      <RecommendationSection industryForecast={industryForecast} />
    </>
  )
}

