"use client"

import { IndustryForecast } from "./types"

interface ForecastCardProps {
  industryForecast: IndustryForecast | null
  refreshing: Record<string, boolean>
  fetchSectionData: (section: string, forceRefresh?: boolean) => void
}

export default function ForecastCard({
  industryForecast,
  refreshing,
  fetchSectionData,
}: ForecastCardProps) {
  return (
    <div className="analysis-card">
      <div className="analysis-card-header">
        <h4 className="analysis-card-title">
          <svg
            viewBox="0 0 24 24"
            style={{
              width: "14px",
              height: "14px",
              stroke: "var(--text-secondary)",
              fill: "none",
              strokeWidth: 1.5,
            }}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          業界予測
        </h4>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {industryForecast?.shortTerm?.outlook && (
            <span
              className={`badge ${industryForecast?.shortTerm.outlook === "positive" ? "badge-success" : industryForecast?.shortTerm.outlook === "negative" ? "badge-warning" : "badge-info"}`}
            >
              {industryForecast?.shortTerm.outlook === "positive"
                ? "↗️ ポジティブ"
                : industryForecast?.shortTerm.outlook === "negative"
                  ? "↘️ ネガティブ"
                  : "→ 中立"}
            </span>
          )}
          <button
            className="refresh-btn-small"
            onClick={() => fetchSectionData("industry-forecast", true)}
            disabled={refreshing["industry-forecast"]}
            title="更新"
          >
            <svg
              viewBox="0 0 24 24"
              className={refreshing["industry-forecast"] ? "spinning" : ""}
              style={{
                width: "14px",
                height: "14px",
                stroke: "currentColor",
                fill: "none",
                strokeWidth: 2,
              }}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
            </svg>
          </button>
        </div>
      </div>
      {industryForecast ? (
        <div style={{ marginTop: "8px" }}>
          {/* 主要指標 */}
          {industryForecast?.indicators && industryForecast?.indicators.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                📊 主要指標予測
              </div>
              {industryForecast?.indicators.slice(0, 5).map((ind, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 8px",
                    marginBottom: "4px",
                    background: "var(--bg-main)",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      marginRight: "8px",
                      color:
                        ind.trend === "up"
                          ? "var(--success)"
                          : ind.trend === "down"
                            ? "var(--danger)"
                            : "var(--text-secondary)",
                    }}
                  >
                    {ind.trend === "up" ? "↗️" : ind.trend === "down" ? "↘️" : "→"}
                  </span>
                  <span style={{ flex: 1 }}>{ind.name}</span>
                  <span style={{ fontWeight: "600", marginRight: "8px" }}>{ind.forecast}</span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      background:
                        ind.confidence === "high"
                          ? "rgba(16,185,129,0.2)"
                          : ind.confidence === "medium"
                            ? "rgba(245,158,11,0.2)"
                            : "rgba(148,163,184,0.2)",
                    }}
                  >
                    {ind.confidence === "high" ? "高" : ind.confidence === "medium" ? "中" : "低"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
          読み込み中...
        </div>
      )}
    </div>
  )
}
