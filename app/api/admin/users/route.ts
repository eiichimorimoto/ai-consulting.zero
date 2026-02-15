/**
 * 管理API: ユーザー一覧・検索・削除
 *
 * GET    /api/admin/users?page=1&limit=20&plan=pro&search=keyword
 * DELETE /api/admin/users?userId=xxx  （アーカイブ後に関連レコード含む削除）
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/check"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyRateLimit } from "@/lib/rate-limit"
import { archiveAndDeleteUser } from "@/lib/admin/archive-user"

export async function GET(request: NextRequest) {
  // 1. 管理者認証
  const { user, error: authError } = await requireAdmin()
  if (authError) return authError

  // 2. レート制限
  const rateLimitError = applyRateLimit(request, "adminRead", user.id)
  if (rateLimitError) return rateLimitError

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const planFilter = searchParams.get("plan") // free, pro, enterprise
    const search = searchParams.get("search")?.trim()
    const offset = (page - 1) * limit

    const supabaseAdmin = createAdminClient()

    // ユーザー一覧クエリ（管理者は除外）
    let query = supabaseAdmin
      .from("profiles")
      .select(
        `
        id,
        user_id,
        name,
        email,
        plan_type,
        monthly_chat_count,
        monthly_ocr_count,
        created_at,
        updated_at,
        companies ( name )
      `,
        { count: "exact" }
      )
      .neq("is_admin", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // プランフィルタ
    if (planFilter && ["free", "pro", "enterprise"].includes(planFilter)) {
      query = query.eq("plan_type", planFilter)
    }

    // テキスト検索（名前 or メール）
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: profiles, error, count } = await query

    if (error) {
      console.error("[Admin/Users] Query error:", error)
      return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 })
    }

    // サブスクリプション情報を並列取得
    const userIds = (profiles || []).map((p) => p.user_id)
    const { data: subscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, status, app_status, plan_type, current_period_end")
      .in("user_id", userIds.length > 0 ? userIds : ["none"])

    const subsMap = new Map(
      (subscriptions || []).map((s) => [s.user_id, s])
    )

    // レスポンス整形
    const users = (profiles || []).map((p) => {
      const sub = subsMap.get(p.user_id)
      return {
        id: p.id,
        userId: p.user_id,
        name: p.name,
        email: p.email,
        companyName: (p.companies as any)?.name || null,
        planType: p.plan_type || "free",
        subscriptionStatus: sub?.status || null,
        appStatus: sub?.app_status || "active",
        currentPeriodEnd: sub?.current_period_end || null,
        monthlyChatCount: p.monthly_chat_count || 0,
        monthlyOcrCount: p.monthly_ocr_count || 0,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }
    })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error("[Admin/Users] Error:", err)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}

/**
 * DELETE: ユーザーの削除（アーカイブ後に関連レコード含む完全削除）
 * 管理者ユーザーは削除不可（管理者設定ページで管理）
 */
export async function DELETE(request: NextRequest) {
  const { user, error: authError } = await requireAdmin()
  if (authError) return authError

  const rateLimitError = applyRateLimit(request, "adminWrite", user.id)
  if (rateLimitError) return rateLimitError

  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get("userId")

    if (!targetUserId) {
      return NextResponse.json({ error: "対象ユーザーIDを指定してください" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 対象ユーザーの確認
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("user_id, name, is_admin")
      .eq("user_id", targetUserId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: "対象ユーザーが見つかりません" }, { status: 404 })
    }

    // 管理者はこのAPIでは削除不可
    if (targetProfile.is_admin) {
      return NextResponse.json(
        { error: "管理者ユーザーはこのAPIでは削除できません。管理者設定ページから操作してください。" },
        { status: 400 }
      )
    }

    // アーカイブ後に削除
    const result = await archiveAndDeleteUser(targetUserId, user.id, "管理者によるユーザー削除")

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log(`[Admin/Users] User archived & deleted by ${user.id}: ${targetUserId} (${targetProfile.name}, archive: ${result.archiveId})`)
    return NextResponse.json({ success: true, archiveId: result.archiveId })
  } catch (err) {
    console.error("[Admin/Users] Delete error:", err)
    return NextResponse.json({ error: "ユーザーの削除に失敗しました" }, { status: 500 })
  }
}
