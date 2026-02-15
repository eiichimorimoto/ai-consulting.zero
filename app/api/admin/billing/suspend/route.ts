/**
 * 管理API: サブスクリプション停止/復旧
 *
 * POST /api/admin/billing/suspend
 * Body: { userId: string, action: "suspend" | "restore", reason?: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/check"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAdminAction } from "@/lib/admin/activity-log"
import { notifyAdminAction, notifyServiceSuspended, notifyServiceRestored } from "@/lib/slack/templates"
import { applyRateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const { user: admin, error: authError } = await requireAdmin()
  if (authError) return authError

  const rateLimitError = applyRateLimit(request, "adminWrite", admin.id)
  if (rateLimitError) return rateLimitError

  try {
    const body = await request.json()
    const { userId, action, reason } = body as {
      userId: string
      action: "suspend" | "restore"
      reason?: string
    }

    if (!userId || !action || !["suspend", "restore"].includes(action)) {
      return NextResponse.json(
        { error: "userId と action (suspend/restore) が必要です" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 対象ユーザーの確認
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, email, plan_type")
      .eq("user_id", userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 })
    }

    // サブスクリプションの app_status を更新
    const newStatus = action === "suspend" ? "suspended" : "active"
    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update({ app_status: newStatus })
      .eq("user_id", userId)

    if (updateError) {
      console.error("[Admin/Billing/Suspend] Update error:", updateError)
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 })
    }

    // 監査ログ
    await logAdminAction({
      userId: admin.id,
      actionType: action === "suspend" ? "suspend_subscription" : "restore_subscription",
      entityType: "subscription",
      entityId: userId,
      details: { targetUser: userId, reason, adminEmail: admin.email },
    })

    // Slack通知
    if (action === "suspend") {
      await notifyServiceSuspended({
        userName: profile.name,
        email: profile.email,
        plan: profile.plan_type || "free",
        reason: reason || "管理者による停止",
      })
    } else {
      await notifyServiceRestored({
        userName: profile.name,
        email: profile.email,
        plan: profile.plan_type || "free",
      })
    }

    await notifyAdminAction({
      adminEmail: admin.email || "admin",
      action: action === "suspend" ? "サブスクリプション停止" : "サブスクリプション復旧",
      targetUser: `${profile.name} (${profile.email})`,
      details: reason,
    })

    return NextResponse.json({
      success: true,
      message: action === "suspend" ? "サブスクリプションを停止しました" : "サブスクリプションを復旧しました",
    })
  } catch (err) {
    console.error("[Admin/Billing/Suspend] Error:", err)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}
