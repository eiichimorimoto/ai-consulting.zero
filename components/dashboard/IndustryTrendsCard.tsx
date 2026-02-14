"use client"

import { IndustryTrends, Company } from "./types"

interface IndustryTrendsCardProps {
  industryTrends: IndustryTrends | null
  company: Company | null
  refreshing: Record<string, boolean>
  fetchSectionData: (section: string, forceRefresh?: boolean) => void
}

export default function IndustryTrendsCard({
  industryTrends,
  company,
  refreshing,
  fetchSectionData,
}: IndustryTrendsCardProps) {
  return (
    <div id="industry-trends-section" className="analysis-card">
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
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          業界動向（{company?.industry || "業界"}）
        </h4>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {industryTrends?.summary?.overallDirection && (
            <span
              className={`badge ${industryTrends?.summary.overallDirection === "up" ? "badge-success" : industryTrends?.summary.overallDirection === "down" ? "badge-warning" : "badge-info"}`}
            >
              {industryTrends?.summary.overallDirection === "up"
                ? "↗️ 上昇傾向"
                : industryTrends?.summary.overallDirection === "down"
                  ? "↘️ 下降傾向"
                  : "→ 横ばい"}
            </span>
          )}
          <button
            className="refresh-btn-small"
            onClick={() => fetchSectionData("industry-trends", true)}
            disabled={refreshing["industry-trends"]}
            title="更新"
          >
            <svg
              viewBox="0 0 24 24"
              className={refreshing["industry-trends"] ? "spinning" : ""}
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
      {industryTrends?.trends ? (
        <div style={{ marginTop: "8px" }}>
          {industryTrends?.trends.slice(0, 5).map((trend, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                padding: "12px",
                marginBottom: "8px",
                background: "var(--bg-main)",
                borderRadius: "8px",
                gap: "12px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    trend.direction === "up"
                      ? "rgba(16,185,129,0.15)"
                      : trend.direction === "down"
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(148,163,184,0.15)",
                  flexShrink: 0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: "18px",
                    height: "18px",
                    stroke:
                      trend.direction === "up"
                        ? "#10b981"
                        : trend.direction === "down"
                          ? "#ef4444"
                          : "#64748b",
                    fill: "none",
                    strokeWidth: 2.5,
                  }}
                >
                  {trend.direction === "up" ? (
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                  ) : trend.direction === "down" ? (
                    <path d="M18 4v10M12 4v16M6 4v6" />
                  ) : (
                    <path d="M4 12h16" />
                  )}
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text-primary)",
                    marginBottom: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {trend.category}
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background:
                        trend.strength === "strong"
                          ? "rgba(16,185,129,0.2)"
                          : trend.strength === "moderate"
                            ? "rgba(245,158,11,0.2)"
                            : "rgba(148,163,184,0.2)",
                      color:
                        trend.strength === "strong"
                          ? "#10b981"
                          : trend.strength === "moderate"
                            ? "#f59e0b"
                            : "#64748b",
                      fontWeight: "500",
                    }}
                  >
                    {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}{" "}
                    {trend.strength === "strong"
                      ? "強い影響"
                      : trend.strength === "moderate"
                        ? "中程度"
                        : "弱い"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.6",
                    marginBottom: "4px",
                  }}
                >
                  {trend.description || trend.title}
                </div>
                {trend.impact && (
                  <div
                    style={{ fontSize: "11px", color: "var(--text-light)", fontStyle: "italic" }}
                  >
                    💡 {trend.impact}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
          読み込み中...
        </div>
      )}
    </div>
  )
}
