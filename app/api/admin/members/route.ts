/**
 * 管理者メンバー管理API
 * GET: 管理者一覧（is_admin = true のユーザー）
 * DELETE: 管理者権限剥奪 or 完全削除（deleteUser=true）
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/check"
import { createAdminClient } from "@/lib/supabase/admin"
import { archiveAndDeleteUser } from "@/lib/admin/archive-user"

/**
 * GET: 管理者一覧
 */
export async function GET() {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const supabase = createAdminClient()

    const { data: admins, error: fetchErr } = await supabase
      .from("profiles")
      .select("user_id, name, email, created_at")
      .eq("is_admin", true)
      .order("created_at", { ascending: true })

    if (fetchErr) {
      console.error("[Admin] Fetch members error:", fetchErr)
      return NextResponse.json({ error: "管理者一覧の取得に失敗しました" }, { status: 500 })
    }

    const result = (admins || []).map((admin) => ({
      userId: admin.user_id,
      name: admin.name,
      email: admin.email,
      createdAt: admin.created_at,
      isSelf: admin.user_id === user.id,
    }))

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error("[Admin] Members list error:", err)
    return NextResponse.json({ error: "管理者一覧の取得に失敗しました" }, { status: 500 })
  }
}

/**
 * DELETE: 管理者権限剥奪
 */
export async function DELETE(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get("userId")

    if (!targetUserId) {
      return NextResponse.json({ error: "対象ユーザーIDを指定してください" }, { status: 400 })
    }

    // 自分自身は削除不可
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "自分自身の管理者権限は削除できません" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 管理者数チェック（最後の1人は削除不可）
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_admin", true)

    if ((count || 0) <= 1) {
      return NextResponse.json({ error: "最後の管理者は削除できません" }, { status: 400 })
    }

    const deleteUser = searchParams.get("deleteUser") === "true"

    if (deleteUser) {
      // アーカイブ後に完全削除
      const result = await archiveAndDeleteUser(targetUserId, user.id, "管理者による管理者アカウント削除")

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      console.log(`[Admin] Admin archived & deleted by ${user.id}: ${targetUserId} (archive: ${result.archiveId})`)
      return NextResponse.json({ success: true, action: "deleted", archiveId: result.archiveId })
    }

    // 権限剥奪のみ
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ is_admin: false })
      .eq("user_id", targetUserId)

    if (updateErr) {
      console.error("[Admin] Remove admin error:", updateErr)
      return NextResponse.json({ error: "管理者権限の削除に失敗しました" }, { status: 500 })
    }

    console.log(`[Admin] Admin role removed by ${user.id}: ${targetUserId}`)
    return NextResponse.json({ success: true, action: "demoted" })
  } catch (err) {
    console.error("[Admin] Remove admin error:", err)
    return NextResponse.json({ error: "管理者権限の削除に失敗しました" }, { status: 500 })
  }
}
