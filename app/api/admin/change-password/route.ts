/**
 * パスワード変更API
 * POST: 現在のパスワード確認 + 新しいパスワードに更新
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/check"

export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "現在のパスワードと新しいパスワードを入力してください" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "新しいパスワードは8文字以上で入力してください" }, { status: 400 })
    }

    const supabase = await createClient()

    // 現在のパスワードで再認証（本人確認）
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (reAuthErr) {
      return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 401 })
    }

    // Supabase の updateUser でパスワード変更
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateErr) {
      console.error("[Admin] Password change error:", updateErr)
      return NextResponse.json({ error: "パスワードの変更に失敗しました: " + updateErr.message }, { status: 500 })
    }

    console.log(`[Admin] Password changed for: ${user.id}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Admin] Password change error:", err)
    return NextResponse.json({ error: "パスワードの変更に失敗しました" }, { status: 500 })
  }
}
