/**
 * ユーザーアーカイブ処理
 *
 * ユーザー削除前に全関連データをJSON形式で archived_users テーブルに保存し、
 * その後に関連レコードを削除する。
 *
 * 必要なテーブル:
 * CREATE TABLE archived_users (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   original_user_id uuid NOT NULL,
 *   email text,
 *   name text,
 *   was_admin boolean NOT NULL DEFAULT false,
 *   archived_data jsonb NOT NULL,
 *   archived_by uuid NOT NULL REFERENCES auth.users(id),
 *   reason text,
 *   archived_at timestamptz NOT NULL DEFAULT now()
 * );
 *
 * ALTER TABLE archived_users ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "admins_manage_archives" ON archived_users
 *   FOR ALL USING (
 *     EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
 *   );
 */

import { createAdminClient } from "@/lib/supabase/admin"

interface ArchiveResult {
  success: boolean
  archiveId?: string
  error?: string
}

/**
 * ユーザーの全関連データを収集
 */
async function collectUserData(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  // プロフィール
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  // コンサルティングセッション + メッセージ + ステップレポート
  const { data: sessions } = await supabase
    .from("consulting_sessions")
    .select("*")
    .eq("user_id", userId)
  const sessionIds = (sessions || []).map((s) => s.id)

  let messages: any[] = []
  let stepReports: any[] = []
  if (sessionIds.length > 0) {
    const { data: msgs } = await supabase
      .from("consulting_messages")
      .select("*")
      .in("session_id", sessionIds)
    messages = msgs || []

    const { data: steps } = await supabase
      .from("consulting_step_reports")
      .select("*")
      .in("session_id", sessionIds)
    stepReports = steps || []
  }

  // レポート + 共有提案
  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
  const reportIds = (reports || []).map((r) => r.id)

  let sharedProposals: any[] = []
  if (reportIds.length > 0) {
    const { data: proposals } = await supabase
      .from("shared_proposals")
      .select("*")
      .in("report_id", reportIds)
    sharedProposals = proposals || []
  }

  // その他のテーブル
  const { data: activityLogs } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)

  const { data: paymentFailures } = await supabase
    .from("payment_failures")
    .select("*")
    .eq("user_id", userId)

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)

  const { data: businessCards } = await supabase
    .from("business_cards")
    .select("*")
    .eq("user_id", userId)

  const { data: cancellationReasons } = await supabase
    .from("cancellation_reasons")
    .select("*")
    .eq("user_id", userId)

  return {
    profile,
    consulting_sessions: sessions || [],
    consulting_messages: messages,
    consulting_step_reports: stepReports,
    reports: reports || [],
    shared_proposals: sharedProposals,
    activity_logs: activityLogs || [],
    payment_failures: paymentFailures || [],
    subscriptions: subscriptions || [],
    business_cards: businessCards || [],
    cancellation_reasons: cancellationReasons || [],
  }
}

/**
 * ユーザーの関連レコードを正しいFK順序で削除
 */
async function deleteUserRecords(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  // 1. consulting_messages, consulting_step_reports（session_id経由）
  const { data: sessions } = await supabase
    .from("consulting_sessions")
    .select("id")
    .eq("user_id", userId)
  const sessionIds = (sessions || []).map((s) => s.id)

  if (sessionIds.length > 0) {
    await supabase.from("consulting_messages").delete().in("session_id", sessionIds)
    await supabase.from("consulting_step_reports").delete().in("session_id", sessionIds)
  }

  // 2. shared_proposals（report_id経由）
  const { data: reports } = await supabase
    .from("reports")
    .select("id")
    .eq("user_id", userId)
  const reportIds = (reports || []).map((r) => r.id)

  if (reportIds.length > 0) {
    await supabase.from("shared_proposals").delete().in("report_id", reportIds)
  }

  // 3. 直接user_idを持つテーブル
  await supabase.from("reports").delete().eq("user_id", userId)
  await supabase.from("consulting_sessions").delete().eq("user_id", userId)
  await supabase.from("activity_logs").delete().eq("user_id", userId)
  await supabase.from("payment_failures").delete().eq("user_id", userId)
  // cancellation_reasons は subscription_id FK があるため subscriptions より先に削除
  await supabase.from("cancellation_reasons").delete().eq("user_id", userId)
  await supabase.from("subscriptions").delete().eq("user_id", userId)
  await supabase.from("business_cards").delete().eq("user_id", userId)

  // 4. プロフィール削除
  await supabase.from("profiles").delete().eq("user_id", userId)

  // 5. auth.users から削除
  const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(userId)
  if (authDeleteErr) {
    throw new Error(`認証ユーザーの削除に失敗: ${authDeleteErr.message}`)
  }
}

/**
 * ユーザーをアーカイブして削除
 *
 * 1. 全関連データをJSONで archived_users に保存
 * 2. 関連レコードを正しいFK順序で削除
 * 3. auth.users から削除
 */
export async function archiveAndDeleteUser(
  userId: string,
  archivedBy: string,
  reason?: string
): Promise<ArchiveResult> {
  const supabase = createAdminClient()

  try {
    // データ収集
    const archivedData = await collectUserData(supabase, userId)

    if (!archivedData.profile) {
      return { success: false, error: "対象ユーザーが見つかりません" }
    }

    // アーカイブ保存
    const { data: archive, error: archiveErr } = await supabase
      .from("archived_users")
      .insert({
        original_user_id: userId,
        email: archivedData.profile.email,
        name: archivedData.profile.name,
        was_admin: archivedData.profile.is_admin || false,
        archived_data: archivedData,
        archived_by: archivedBy,
        reason: reason || null,
      })
      .select("id")
      .single()

    if (archiveErr) {
      console.error("[Archive] Save error:", archiveErr)
      return { success: false, error: "アーカイブの保存に失敗しました" }
    }

    // 削除実行
    await deleteUserRecords(supabase, userId)

    console.log(`[Archive] User archived and deleted: ${userId} (archive: ${archive.id})`)
    return { success: true, archiveId: archive.id }
  } catch (err) {
    console.error("[Archive] Error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "アーカイブ処理に失敗しました",
    }
  }
}
