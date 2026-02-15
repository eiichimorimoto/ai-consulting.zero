/**
 * 招待コード管理API
 * GET: 招待コード一覧（管理者のみ）
 * POST: 新規招待コード発行（管理者のみ）
 * DELETE: 招待コード取消（管理者のみ）
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/check"
import { createAdminClient } from "@/lib/supabase/admin"
import crypto from "crypto"

/**
 * GET: 招待コード一覧
 */
export async function GET() {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const supabase = createAdminClient()

    const { data: invitations, error: fetchErr } = await supabase
      .from("admin_invitations")
      .select("*")
      .order("created_at", { ascending: false })

    if (fetchErr) {
      console.error("[Admin] Fetch invitations error:", fetchErr)
      return NextResponse.json({ error: "招待コードの取得に失敗しました" }, { status: 500 })
    }

    // ステータスを計算して返す
    const now = new Date()
    const result = (invitations || []).map((inv) => ({
      id: inv.id,
      code: inv.code,
      createdBy: inv.created_by,
      usedBy: inv.used_by,
      expiresAt: inv.expires_at,
      usedAt: inv.used_at,
      createdAt: inv.created_at,
      status: inv.used_at
        ? "used"
        : new Date(inv.expires_at) < now
          ? "expired"
          : "active",
    }))

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error("[Admin] Invitations list error:", err)
    return NextResponse.json({ error: "招待コード一覧の取得に失敗しました" }, { status: 500 })
  }
}

/**
 * POST: 新規招待コード発行
 */
export async function POST() {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const supabase = createAdminClient()

    // 招待コード生成（8文字のランダム文字列）
    const code = crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()

    // 72時間後に有効期限
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 72)

    const { data: invitation, error: insertErr } = await supabase
      .from("admin_invitations")
      .insert({
        code,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (insertErr) {
      console.error("[Admin] Create invitation error:", insertErr)
      return NextResponse.json({ error: "招待コードの発行に失敗しました" }, { status: 500 })
    }

    console.log(`[Admin] Invitation created by ${user.id}: ${code}`)
    return NextResponse.json({
      data: {
        id: invitation.id,
        code: invitation.code,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
      },
    })
  } catch (err) {
    console.error("[Admin] Create invitation error:", err)
    return NextResponse.json({ error: "招待コードの発行に失敗しました" }, { status: 500 })
  }
}

/**
 * DELETE: 招待コード取消
 */
export async function DELETE(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get("id")

    if (!invitationId) {
      return NextResponse.json({ error: "招待コードIDを指定してください" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 使用済みコードは取消不可
    const { data: invitation } = await supabase
      .from("admin_invitations")
      .select("used_at")
      .eq("id", invitationId)
      .single()

    if (invitation?.used_at) {
      return NextResponse.json({ error: "使用済みの招待コードは取り消せません" }, { status: 400 })
    }

    const { error: deleteErr } = await supabase
      .from("admin_invitations")
      .delete()
      .eq("id", invitationId)

    if (deleteErr) {
      console.error("[Admin] Delete invitation error:", deleteErr)
      return NextResponse.json({ error: "招待コードの取消に失敗しました" }, { status: 500 })
    }

    console.log(`[Admin] Invitation deleted by ${user.id}: ${invitationId}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Admin] Delete invitation error:", err)
    return NextResponse.json({ error: "招待コードの取消に失敗しました" }, { status: 500 })
  }
}
