/**
 * 管理者用: 操作ログ一覧API
 *
 * GET /api/admin/activity-log
 * クエリパラメータ:
 *   - page: ページ番号 (default: 1)
 *   - limit: 1ページあたり件数 (default: 30)
 *   - actionType: アクションタイプでフィルタ
 *   - userId: 特定ユーザーでフィルタ
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/check"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const limitRes = await applyRateLimit(request, "adminRead", user.id)
  if (limitRes) return limitRes

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "30")))
  const actionType = searchParams.get("actionType") || ""
  const userId = searchParams.get("userId") || ""
  const offset = (page - 1) * limit

  try {
    const supabaseAdmin = createAdminClient()

    let query = supabaseAdmin
      .from("activity_logs")
      .select(
        `
        id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        details,
        created_at,
        profiles(display_name, email)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (actionType) {
      query = query.eq("action_type", actionType)
    }

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data: logs, count, error: queryError } = await query

    if (queryError) {
      console.error("[Admin ActivityLog] Query error:", queryError)
      return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({
      logs: (logs || []).map((l: any) => ({
        id: l.id,
        userId: l.user_id,
        actionType: l.action_type,
        entityType: l.entity_type,
        entityId: l.entity_id,
        details: l.details,
        userName: l.profiles?.display_name || "不明",
        userEmail: l.profiles?.email || "",
        createdAt: l.created_at,
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error("[Admin ActivityLog] Error:", err)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}
