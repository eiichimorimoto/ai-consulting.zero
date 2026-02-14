import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // デジタルスコアが存在する会社を取得
    const { data: scores, error: scoresError } = await supabase
      .from("digital_scores")
      .select("company_id")
      .order("created_at", { ascending: false })

    if (scoresError) throw scoresError

    // 重複を除去
    const uniqueCompanyIds = [...new Set(scores.map((s) => s.company_id))]

    const results = []

    for (const companyId of uniqueCompanyIds) {
      try {
        // 各社の診断を実行
        const response = await fetch("http://localhost:3000/api/generate-diagnosis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        })

        const result = await response.json()

        results.push({
          companyId,
          success: result.success || false,
          reportId: result.report?.id || null,
          error: result.error || null,
        })

        // レート制限対策（2秒待機）
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error: unknown) {
        results.push({
          companyId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return NextResponse.json({
      total: uniqueCompanyIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    })
  } catch (error: unknown) {
    console.error("Batch diagnosis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
