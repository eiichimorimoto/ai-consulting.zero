/**
 * 管理API: 決済失敗一覧
 *
 * GET /api/admin/billing/payment-failures?status=active&page=1&limit=20
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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const statusFilter = searchParams.get("status") // active, resolved, all
    const offset = (page - 1) * limit

    const supabaseAdmin = createAdminClient()

    let query = supabaseAdmin
      .from("payment_failures")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // ステータスフィルタ
    if (statusFilter === "resolved") {
      query = query.eq("dunning_status", "resolved")
    } else if (statusFilter !== "all") {
      // デフォルト: 未解決のみ
      query = query.neq("dunning_status", "resolved")
    }

    const { data: failures, error, count } = await query

    if (error) {
      console.error("[Admin/Billing] Query error:", error)
      return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 })
    }

    // ユーザー情報を取得
    const userIds = [...new Set((failures || []).map((f) => f.user_id).filter(Boolean))]
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, name, email")
      .in("user_id", userIds.length > 0 ? userIds : ["none"])

    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    )

    const items = (failures || []).map((f) => {
      const profile = profileMap.get(f.user_id)
      return {
        ...f,
        userName: profile?.name || "不明",
        userEmail: profile?.email || "不明",
      }
    })

    return NextResponse.json({
      failures: items,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error("[Admin/Billing/Failures] Error:", err)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}
