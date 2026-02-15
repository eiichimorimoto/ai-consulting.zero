/**
 * 管理者用: コンサルセッション一覧API
 *
 * GET /api/admin/content/sessions
 * クエリパラメータ:
 *   - page: ページ番号 (default: 1)
 *   - limit: 1ページあたり件数 (default: 20)
 *   - userId: 特定ユーザーでフィルタ
 *   - search: セッションタイトル検索
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
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")))
  const userId = searchParams.get("userId") || ""
  const search = searchParams.get("search") || ""
  const offset = (page - 1) * limit

  try {
    const supabaseAdmin = createAdminClient()

    // セッション一覧クエリ
    let query = supabaseAdmin
      .from("consulting_sessions")
      .select(
        `
        id,
        user_id,
        title,
        status,
        message_count,
        created_at,
        updated_at,
        profiles!inner(display_name, email)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId) {
      query = query.eq("user_id", userId)
    }

    if (search) {
      query = query.ilike("title", `%${search}%`)
    }

    const { data: sessions, count, error: queryError } = await query

    if (queryError) {
      console.error("[Admin Sessions] Query error:", queryError)
      return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({
      sessions: (sessions || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        title: s.title || "無題のセッション",
        status: s.status,
        messageCount: s.message_count || 0,
        userName: s.profiles?.display_name || "不明",
        userEmail: s.profiles?.email || "",
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error("[Admin Sessions] Error:", err)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}
