/**
 * 招待コード検証API
 * POST: 招待コードの有効性を確認（認証不要 — 登録前に使用）
 */

import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "招待コードを入力してください" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: invitation, error } = await supabase
      .from("admin_invitations")
      .select("id, code, expires_at, used_at")
      .eq("code", code.trim())
      .single()

    if (error || !invitation) {
      return NextResponse.json({ valid: false, error: "無効な招待コードです" })
    }

    // 使用済みチェック
    if (invitation.used_at) {
      return NextResponse.json({ valid: false, error: "この招待コードは既に使用されています" })
    }

    // 有効期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "この招待コードは有効期限が切れています" })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error("[Admin] Validate invite error:", err)
    return NextResponse.json({ error: "招待コードの検証に失敗しました" }, { status: 500 })
  }
}
