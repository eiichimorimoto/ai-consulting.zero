/**
 * 管理API: ユーザー詳細
 *
 * GET /api/admin/users/[id] - ユーザー詳細情報を取得
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/check"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAdmin()
  if (authError) return authError

  const rateLimitError = applyRateLimit(request, "adminRead", user.id)
  if (rateLimitError) return rateLimitError

  try {
    const { id } = await params
    const supabaseAdmin = createAdminClient()

    // プロファイル + 会社 + サブスク + セッション統計を並列取得
    const [profileResult, subscriptionResult, sessionsResult, reportsResult] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("*, companies ( * )")
          .eq("user_id", id)
          .single(),
        supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq("user_id", id)
          .maybeSingle(),
        supabaseAdmin
          .from("consulting_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", id),
        supabaseAdmin
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", id),
      ])

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 })
    }

    // 直近のアクティビティログ（最新10件）
    const { data: activityLogs } = await supabaseAdmin
      .from("activity_logs")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10)

    return NextResponse.json({
      profile: profileResult.data,
      subscription: subscriptionResult.data,
      stats: {
        totalSessions: sessionsResult.count || 0,
        totalReports: reportsResult.count || 0,
      },
      recentActivity: activityLogs || [],
    })
  } catch (err) {
    console.error("[Admin/Users/Detail] Error:", err)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}
