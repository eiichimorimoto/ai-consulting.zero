/**
 * 管理操作ログ記録ヘルパー
 *
 * 既存の activity_logs テーブルを活用して管理者アクションを記録する。
 * 監査証跡（Audit Trail）として、全管理操作の追跡に使用。
 *
 * @see supabase/schema.sql - activity_logs テーブル
 */

import { createAdminClient } from "@/lib/supabase/admin"
import type { AdminActionLog } from "@/types/admin"

/**
 * 管理操作をactivity_logsに記録する
 *
 * @param log - ログ情報
 * @returns 成功/失敗
 */
export async function logAdminAction(log: AdminActionLog): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin.from("activity_logs").insert({
      user_id: log.userId,
      action_type: log.actionType,
      entity_type: log.entityType,
      entity_id: log.entityId || null,
      details: log.details || null,
    })

    if (error) {
      console.error("[AdminLog] Failed to write activity log:", error)
      return { success: false, error: error.message }
    }

    console.log(
      `[AdminLog] ${log.actionType}: ${log.entityType}${log.entityId ? `/${log.entityId}` : ""} by ${log.userId}`
    )
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[AdminLog] Error:", message)
    return { success: false, error: message }
  }
}
