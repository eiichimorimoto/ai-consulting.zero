/**
 * 新規登録Slack通知API
 *
 * complete-profile（クライアントコンポーネント）から呼ばれる。
 * Slack通知の失敗はユーザー体験に影響させない（fire-and-forget寄り）。
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { notifyUserSignup } from "@/lib/slack/templates"

export async function POST(request: Request) {
  try {
    // 認証チェック（ログイン中のユーザー自身のみ呼べる）
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userName, companyName } = body

    // Slack通知（失敗してもエラーにしない）
    await notifyUserSignup({
      userName: userName || user.user_metadata?.full_name || "不明",
      email: user.email || "不明",
      companyName: companyName || undefined,
    }).catch((err) => {
      console.error("Slack通知エラー（サインアップ）:", err)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("notify-signup error:", error)
    // 通知失敗でもクライアントにはsuccess（UXを妨げない）
    return NextResponse.json({ success: true })
  }
}
