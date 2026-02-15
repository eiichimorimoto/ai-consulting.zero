"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users,
  TrendingUp,
  CreditCard,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  UserMinus,
} from "lucide-react"

interface AnalyticsData {
  kpi: {
    totalUsers: number
    newUsers: number
    prevNewUsers: number
    activeSubscriptions: number
    mrr: number
    arr: number
    churnRate: number
    sessionsToday: number
    sessionsPeriod: number
  }
  planDistribution: Record<string, number>
  dailySignupTrend: Array<{ date: string; count: number }>
  period: { days: number; from: string; to: string }
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics/overview?days=${days}`)
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error("Failed to fetch:", err)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 300000) // 5分間隔
    return () => clearInterval(interval)
  }, [fetchAnalytics])

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString()}`

  const growthRate = data
    ? data.kpi.prevNewUsers > 0
      ? Math.round(((data.kpi.newUsers - data.kpi.prevNewUsers) / data.kpi.prevNewUsers) * 100)
      : data.kpi.newUsers > 0
        ? 100
        : 0
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">分析・KPI</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            ビジネスの主要指標を確認できます（5分更新）
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 期間選択 */}
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  days === d
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                {d}日
              </button>
            ))}
          </div>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-12 text-center text-zinc-400">
          データを読み込み中...
        </div>
      ) : data ? (
        <>
          {/* KPIカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="総ユーザー数"
              value={data.kpi.totalUsers.toLocaleString()}
              subLabel={`新規 +${data.kpi.newUsers} (${days}日間)`}
              icon={<Users className="h-5 w-5" />}
              trend={growthRate}
              color="blue"
            />
            <MetricCard
              label="MRR（月間経常収益）"
              value={formatCurrency(data.kpi.mrr)}
              subLabel={`ARR: ${formatCurrency(data.kpi.arr)}`}
              icon={<CreditCard className="h-5 w-5" />}
              color="green"
            />
            <MetricCard
              label="有料サブスク"
              value={String(data.kpi.activeSubscriptions)}
              subLabel={`解約率: ${data.kpi.churnRate}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              color="purple"
            />
            <MetricCard
              label={`セッション数 (${days}日)`}
              value={data.kpi.sessionsPeriod.toLocaleString()}
              subLabel={`本日: ${data.kpi.sessionsToday}件`}
              icon={<MessageSquare className="h-5 w-5" />}
              color="orange"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* プラン別ユーザー分布 */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                プラン別ユーザー分布
              </h2>
              <div className="space-y-3">
                {Object.entries(data.planDistribution).map(([plan, count]) => {
                  const total = Object.values(data.planDistribution).reduce(
                    (a, b) => a + b,
                    0
                  )
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  const colors: Record<string, string> = {
                    free: "bg-zinc-400",
                    pro: "bg-blue-500",
                    enterprise: "bg-purple-500",
                  }
                  return (
                    <div key={plan}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {count}名 ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[plan] || "bg-zinc-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 日別新規登録トレンド */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                新規登録トレンド（{days}日間）
              </h2>
              {data.dailySignupTrend.length === 0 ? (
                <p className="text-sm text-zinc-400 py-8 text-center">
                  期間内のデータがありません
                </p>
              ) : (
                <div className="space-y-1">
                  {/* シンプルなバーチャート */}
                  <div className="flex items-end gap-0.5 h-32">
                    {data.dailySignupTrend.slice(-30).map((d, i) => {
                      const max = Math.max(
                        ...data.dailySignupTrend.map((t) => t.count),
                        1
                      )
                      const height = (d.count / max) * 100
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-blue-400 rounded-t hover:bg-blue-500 transition-colors"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${d.date}: ${d.count}名`}
                        />
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>
                      {data.dailySignupTrend[0]?.date?.slice(5) || ""}
                    </span>
                    <span>
                      {data.dailySignupTrend[data.dailySignupTrend.length - 1]?.date?.slice(5) || ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function MetricCard({
  label,
  value,
  subLabel,
  icon,
  trend,
  color,
}: {
  label: string
  value: string
  subLabel: string
  icon: React.ReactNode
  trend?: number
  color: string
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400",
    purple: "bg-purple-50 dark:bg-purple-950 text-purple-600",
    orange: "bg-orange-50 dark:bg-orange-950 text-orange-600",
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
            }`}
          >
            {trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{subLabel}</p>
    </div>
  )
}
