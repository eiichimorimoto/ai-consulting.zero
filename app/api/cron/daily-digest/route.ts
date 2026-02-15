/**
 * 日次ダイジェスト Cron API
 *
 * GET /api/cron/daily-digest
 *
 * Vercel Cron で毎朝7:00 JST (22:00 UTC) に呼び出し。
 * vercel.json に以下を追加:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-digest",
 *     "schedule": "0 22 * * *"
 *   }]
 * }
 *
 * セキュリティ: CRON_SECRET ヘッダーで認証
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyDailyDigest } from "@/lib/slack/templates"

export async function GET(request: NextRequest) {
  // Vercel Cron認証
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabaseAdmin = createAdminClient()
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString()

    // 並列でデータ取得
    const [
      usersResult,
      newUsersResult,
      sessionsResult,
      subscriptionsResult,
      failuresResult,
    ] = await Promise.all([
      // 総ユーザー数
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),

      // 昨日の新規ユーザー
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", yesterdayISO),

      // 昨日のセッション数
      supabaseAdmin
        .from("consulting_sessions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", yesterdayISO),

      // 有料サブスク数
      supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .neq("plan_type", "free"),

      // 未解決の決済失敗
      supabaseAdmin
        .from("payment_failures")
        .select("id", { count: "exact", head: true })
        .in("dunning_status", ["retry_scheduled", "final_warning"]),
    ])

    // MRR計算
    const { data: activeSubs } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type")
      .eq("status", "active")
      .neq("plan_type", "free")

    const planPrices: Record<string, number> = {
      pro: 35000,
      enterprise: 120000,
    }

    const mrr = (activeSubs || []).reduce(
      (sum, s) => sum + (planPrices[s.plan_type] || 0),
      0
    )

    const yesterdayStr = yesterday.toISOString().split("T")[0]
    await notifyDailyDigest({
      date: yesterdayStr,
      dau: usersResult.count || 0,
      newUsers: newUsersResult.count || 0,
      canceledUsers: 0,
      sessions: sessionsResult.count || 0,
      revenue: `¥${mrr.toLocaleString()} MRR`,
      paymentFailures: failuresResult.count || 0,
    })

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
    })
  } catch (err) {
    console.error("[DailyDigest] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
