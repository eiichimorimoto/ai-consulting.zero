/**
 * 管理者登録API
 * POST: 招待コード消費 + is_admin フラグ設定
 */

import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, code } = body

    if (!userId || !code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "パラメータが不足しています" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. 招待コードの再検証（レースコンディション防止）
    const { data: invitation, error: invErr } = await supabase
      .from("admin_invitations")
      .select("id, expires_at, used_at")
      .eq("code", code.trim())
      .single()

    if (invErr || !invitation) {
      return NextResponse.json({ error: "無効な招待コードです" }, { status: 400 })
    }

    if (invitation.used_at) {
      return NextResponse.json({ error: "この招待コードは既に使用されています" }, { status: 400 })
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "招待コードの有効期限が切れています" }, { status: 400 })
    }

    // 2. プロファイルに is_admin = true を設定
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ is_admin: true })
      .eq("user_id", userId)

    if (profileErr) {
      console.error("[Admin] Profile update error:", profileErr)
      return NextResponse.json({ error: "管理者権限の設定に失敗しました" }, { status: 500 })
    }

    // 3. 招待コードを消費済みに
    const { error: useErr } = await supabase
      .from("admin_invitations")
      .update({
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)

    if (useErr) {
      console.error("[Admin] Invitation consume error:", useErr)
      // ロールバック: is_admin を false に戻す
      await supabase.from("profiles").update({ is_admin: false }).eq("user_id", userId)
      return NextResponse.json({ error: "招待コードの消費に失敗しました" }, { status: 500 })
    }

    console.log(`[Admin] New admin registered: ${userId}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Admin] Register error:", err)
    return NextResponse.json({ error: "管理者登録に失敗しました" }, { status: 500 })
  }
}
