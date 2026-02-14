import { NextResponse } from "next/server"
import { runHealthChecks } from "@/lib/health-monitor"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    // 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const report = await runHealthChecks()

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: "ヘルスチェックの実行に失敗しました",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    )
  }
}
