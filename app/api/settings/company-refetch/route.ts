/**
 * 会社情報の再取得 API
 * 設定画面の「会社情報を再取得」で呼び出す。
 * company-intel を実行して companies を更新し、該当会社の dashboard_data を削除する（キャッシュ無効化）。
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "会社情報が見つかりません" }, { status: 404 })
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, website, prefecture, city, address")
      .eq("id", profile.company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: "会社情報の取得に失敗しました" }, { status: 404 })
    }

    const website = (company.website || "").trim()
    if (!website) {
      return NextResponse.json(
        {
          error:
            "ウェブサイトが登録されていません。会社情報にURLを入力してから再取得してください。",
        },
        { status: 400 }
      )
    }

    const baseUrl = request.url
      ? new URL(request.url).origin
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"

    const intelRes = await fetch(`${baseUrl}/api/company-intel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        website,
        companyName: company.name || "",
        companyPrefecture: company.prefecture || "",
        companyCity: company.city || "",
        companyAddress: company.address || "",
        forceExternalSearch: true,
      }),
    })

    if (!intelRes.ok) {
      const errBody = await intelRes.json().catch(() => ({}))
      const message = (errBody as { error?: string }).error || intelRes.statusText
      return NextResponse.json(
        { error: `会社情報の取得に失敗しました: ${message}` },
        { status: 502 }
      )
    }

    const intelJson = await intelRes.json()
    const data = (intelJson as { data?: Record<string, unknown> }).data
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "会社情報の取得結果が不正です" }, { status: 502 })
    }

    const d = data as Record<string, unknown>
    const updatePayload: Record<string, unknown> = {
      name_kana: d.companyNameKana ?? null,
      industry: d.industry ?? null,
      employee_count: d.employeeCount ?? null,
      annual_revenue: d.annualRevenue ?? null,
      established_date: d.establishedDate ?? null,
      representative_name: d.representativeName ?? null,
      phone: d.phone ?? null,
      fax: d.fax ?? null,
      business_description: d.businessDescription ?? null,
      capital: d.capital ?? null,
      fiscal_year_end: d.fiscalYearEnd !== null ? parseInt(String(d.fiscalYearEnd), 10) : null,
      retrieved_info: data,
    }

    const { error: updateError } = await supabase
      .from("companies")
      .update(updatePayload)
      .eq("id", company.id)

    if (updateError) {
      console.error("Company update error on refetch:", updateError)
      return NextResponse.json({ error: "会社情報の更新に失敗しました" }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from("dashboard_data")
      .delete()
      .eq("company_id", company.id)
      .eq("user_id", user.id)

    if (deleteError) {
      console.error("Dashboard cache delete error (non-fatal):", deleteError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Company refetch error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "会社情報の再取得に失敗しました" },
      { status: 500 }
    )
  }
}
