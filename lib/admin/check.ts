/**
 * 管理者アクセスチェック
 *
 * DB（profiles.is_admin）を優先し、環境変数をフォールバックとして使用する。
 *
 * @example
 * ```typescript
 * const isAdmin = await checkAdminAccess(user.id)
 * if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
 * ```
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * ユーザーIDが管理者かどうかを判定する
 * 1. DB の profiles.is_admin を確認（メイン）
 * 2. 環境変数 ADMIN_USER_IDS をフォールバック（移行期間用）
 */
export async function checkAdminAccess(userId: string): Promise<boolean> {
  try {
    // 1. DB チェック（メイン）
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", userId)
      .single()

    if (data?.is_admin) return true
  } catch (err) {
    // DB接続エラー時はフォールバックへ
    console.warn("[Admin] DB check failed, falling back to env var:", err)
  }

  // 2. 環境変数フォールバック（移行期間用）
  const adminIds =
    process.env.ADMIN_USER_IDS?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) || []

  return adminIds.includes(userId)
}

/**
 * API Route用: 認証＋管理者チェックを一括で行う
 *
 * @returns { user, isAdmin } または エラーレスポンス
 */
export async function requireAdmin(): Promise<
  | { user: { id: string; email?: string }; error: null }
  | { user: null; error: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      ),
    }
  }

  const isAdmin = await checkAdminAccess(user.id)
  if (!isAdmin) {
    console.warn(`[Admin] Unauthorized access attempt: ${user.id} (${user.email})`)
    return {
      user: null,
      error: NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      ),
    }
  }

  return { user: { id: user.id, email: user.email }, error: null }
}
