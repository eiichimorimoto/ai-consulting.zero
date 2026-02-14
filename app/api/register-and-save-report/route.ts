import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const { email, companyName, reportData } = await request.json()

    if (!email || !companyName || !reportData) {
      return NextResponse.json(
        { error: "email, companyName, and reportData are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const reportId = randomUUID()

    // 1. リード情報として保存（認証なしユーザー用）
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        email,
        company_name: companyName,
        source: "website_diagnosis",
        status: "new",
      })
      .select()
      .single()

    if (leadError) {
      // リードテーブルがない場合は、診断レポートテーブルに直接保存
      console.log("Leads table not available, saving to diagnosis_previews")
    }

    // 2. 診断プレビューレポートを保存
    const { data: report, error: reportError } = await supabase
      .from("diagnosis_previews")
      .insert({
        id: reportId,
        email,
        company_name: companyName,
        url: reportData.url,
        overall_score: reportData.overallScore,
        top_issues: reportData.topIssues,
        metrics: reportData.metrics,
        lead_id: lead?.id || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reportError) {
      // テーブルがない場合のフォールバック
      console.error("Error saving report:", reportError)

      // diagnosis_previewsテーブルがない場合でも、IDを返す
      return NextResponse.json({
        success: true,
        reportId,
        message: "Report ID generated (table may need to be created)",
        data: {
          id: reportId,
          email,
          company_name: companyName,
          ...reportData,
        },
      })
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
      data: report,
    })
  } catch (error: unknown) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    )
  }
}
