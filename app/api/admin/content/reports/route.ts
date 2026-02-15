/**
 * 管理者用: レポート一覧API
 *
 * GET /api/admin/content/reports
 * クエリパラメータ:
 *   - page: ページ番号 (default: 1)
 *   - limit: 1ページあたり件数 (default: 20)
 *   - userId: 特定ユーザーでフィルタ
 *   - type: レポートタイプでフィルタ
 *   - status: ステータスでフィルタ
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
  const type = searchParams.get("type") || ""
  const status = searchParams.get("status") || ""
  const offset = (page - 1) * limit

  try {
    const supabaseAdmin = createAdminClient()

    let query = supabaseAdmin
      .from("reports")
      .select(
        `
        id,
        user_id,
        session_id,
        report_type,
        status,
        file_path,
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

    if (type) {
      query = query.eq("report_type", type)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data: reports, count, error: queryError } = await query

    if (queryError) {
      console.error("[Admin Reports] Query error:", queryError)
      return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({
      reports: (reports || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        sessionId: r.session_id,
        reportType: r.report_type,
        status: r.status,
        filePath: r.file_path,
        userName: r.profiles?.display_name || "不明",
        userEmail: r.profiles?.email || "",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error("[Admin Reports] Error:", err)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}
