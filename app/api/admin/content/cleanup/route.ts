/**
 * 管理者用: データクリーンアップAPI
 *
 * POST /api/admin/content/cleanup
 * Body:
 *   - action: "preview" | "execute"
 *   - target: "old_sessions" | "orphaned_reports" | "expired_logs"
 *   - retentionDays: 保持日数 (default: 180)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/check"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAdminAction } from "@/lib/admin/activity-log"
import { applyRateLimit } from "@/lib/rate-limit"
import { notifyAdminAction } from "@/lib/slack/templates"

type CleanupTarget = "old_sessions" | "orphaned_reports" | "expired_logs"

interface CleanupRequest {
  action: "preview" | "execute"
  target: CleanupTarget
  retentionDays?: number
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const limitRes = await applyRateLimit(request, "adminWrite", user.id)
  if (limitRes) return limitRes

  try {
    const body: CleanupRequest = await request.json()
    const { action, target, retentionDays = 180 } = body

    if (!["preview", "execute"].includes(action)) {
      return NextResponse.json({ error: "action は preview または execute を指定してください" }, { status: 400 })
    }

    if (!["old_sessions", "orphaned_reports", "expired_logs"].includes(target)) {
      return NextResponse.json({ error: "無効なクリーンアップ対象です" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    const cutoffISO = cutoffDate.toISOString()

    let affectedCount = 0
    let description = ""

    switch (target) {
      case "old_sessions": {
        // 完了済みの古いセッションをカウント/削除
        const query = supabaseAdmin
          .from("consulting_sessions")
          .select("id", { count: "exact" })
          .eq("status", "completed")
          .lt("updated_at", cutoffISO)

        const { count } = await query
        affectedCount = count || 0
        description = `${retentionDays}日以上前の完了済みセッション`

        if (action === "execute" && affectedCount > 0) {
          const { error: deleteError } = await supabaseAdmin
            .from("consulting_sessions")
            .delete()
            .eq("status", "completed")
            .lt("updated_at", cutoffISO)

          if (deleteError) {
            console.error("[Cleanup] Delete error:", deleteError)
            return NextResponse.json({ error: "削除処理に失敗しました" }, { status: 500 })
          }
        }
        break
      }

      case "orphaned_reports": {
        // セッションが存在しないレポートをカウント/削除
        // Supabaseでは直接的なorphanクエリが難しいため、
        // 古いレポートで status が error のものを対象にする
        const query = supabaseAdmin
          .from("reports")
          .select("id", { count: "exact" })
          .eq("status", "error")
          .lt("created_at", cutoffISO)

        const { count } = await query
        affectedCount = count || 0
        description = `${retentionDays}日以上前のエラー状態レポート`

        if (action === "execute" && affectedCount > 0) {
          const { error: deleteError } = await supabaseAdmin
            .from("reports")
            .delete()
            .eq("status", "error")
            .lt("created_at", cutoffISO)

          if (deleteError) {
            console.error("[Cleanup] Delete error:", deleteError)
            return NextResponse.json({ error: "削除処理に失敗しました" }, { status: 500 })
          }
        }
        break
      }

      case "expired_logs": {
        // 古いアクティビティログをカウント/削除
        const query = supabaseAdmin
          .from("activity_logs")
          .select("id", { count: "exact" })
          .lt("created_at", cutoffISO)

        const { count } = await query
        affectedCount = count || 0
        description = `${retentionDays}日以上前の操作ログ`

        if (action === "execute" && affectedCount > 0) {
          const { error: deleteError } = await supabaseAdmin
            .from("activity_logs")
            .delete()
            .lt("created_at", cutoffISO)

          if (deleteError) {
            console.error("[Cleanup] Delete error:", deleteError)
            return NextResponse.json({ error: "削除処理に失敗しました" }, { status: 500 })
          }
        }
        break
      }
    }

    // 実行した場合はログ記録 + Slack通知
    if (action === "execute" && affectedCount > 0) {
      await logAdminAction({
        userId: user.id,
        actionType: "data_cleanup",
        entityType: target,
        details: { retentionDays, affectedCount, description },
      })

      await notifyAdminAction({
        adminEmail: user.email || "admin",
        action: "データクリーンアップ実行",
        details: `${description} (${affectedCount}件削除)`,
      })
    }

    return NextResponse.json({
      action,
      target,
      description,
      affectedCount,
      retentionDays,
      cutoffDate: cutoffISO,
      executed: action === "execute",
    })
  } catch (err) {
    console.error("[Cleanup] Error:", err)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}
