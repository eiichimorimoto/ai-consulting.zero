/**
 * 管理API: KPI概要
 *
 * GET /api/admin/analytics/overview?days=30
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/check"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAdmin()
  if (authError) return authError

  const rateLimitError = applyRateLimit(request, "adminRead", user.id)
  if (rateLimitError) return rateLimitError

  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") || "30")))

    const supabaseAdmin = createAdminClient()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
    const prevPeriodStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000).toISOString()

    // 並列でデータ取得
    const [
      totalUsersResult,
      newUsersResult,
      prevNewUsersResult,
      activeSubsResult,
      canceledSubsResult,
      todaySessionsResult,
      periodSessionsResult,
      planDistResult,
    ] = await Promise.all([
      // 総ユーザー数
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),

      // 期間内の新規登録
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo),

      // 前期間の新規登録（比較用）
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", prevPeriodStart)
        .lt("created_at", thirtyDaysAgo),

      // 有料サブスク（active）
      supabaseAdmin
        .from("subscriptions")
        .select("plan_type", { count: "exact" })
        .eq("status", "active")
        .in("plan_type", ["pro", "enterprise"]),

      // 期間内の解約
      supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "canceled")
        .gte("updated_at", thirtyDaysAgo),

      // 今日のセッション数
      supabaseAdmin
        .from("consulting_sessions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart),

      // 期間内のセッション数
      supabaseAdmin
        .from("consulting_sessions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo),

      // プラン別ユーザー分布
      supabaseAdmin
        .from("profiles")
        .select("plan_type"),
    ])

    // MRR計算（プラン別単価 × アクティブ数）
    const planPrices: Record<string, number> = { pro: 35000, enterprise: 120000 }
    const activeSubs = activeSubsResult.data || []
    const mrr = activeSubs.reduce((sum, s) => sum + (planPrices[s.plan_type] || 0), 0)
    const arr = mrr * 12

    // 解約率
    const totalActive = totalUsersResult.count || 1
    const canceled = canceledSubsResult.count || 0
    const churnRate = totalActive > 0 ? ((canceled / totalActive) * 100) : 0

    // プラン分布
    const planDist: Record<string, number> = { free: 0, pro: 0, enterprise: 0 }
    ;(planDistResult.data || []).forEach((p) => {
      const plan = p.plan_type || "free"
      planDist[plan] = (planDist[plan] || 0) + 1
    })

    // 日別新規登録トレンド（直近30日）
    const { data: dailySignups } = await supabaseAdmin
      .from("profiles")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true })

    const dailyTrend: Record<string, number> = {}
    ;(dailySignups || []).forEach((p) => {
      const day = new Date(p.created_at).toISOString().split("T")[0]
      dailyTrend[day] = (dailyTrend[day] || 0) + 1
    })

    const trendData = Object.entries(dailyTrend).map(([date, count]) => ({
      date,
      count,
    }))

    return NextResponse.json({
      kpi: {
        totalUsers: totalUsersResult.count || 0,
        newUsers: newUsersResult.count || 0,
        prevNewUsers: prevNewUsersResult.count || 0,
        activeSubscriptions: activeSubs.length,
        mrr,
        arr,
        churnRate: Math.round(churnRate * 100) / 100,
        sessionsToday: todaySessionsResult.count || 0,
        sessionsPeriod: periodSessionsResult.count || 0,
      },
      planDistribution: planDist,
      dailySignupTrend: trendData,
      period: { days, from: thirtyDaysAgo, to: now.toISOString() },
    })
  } catch (err) {
    console.error("[Admin/Analytics] Error:", err)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}
