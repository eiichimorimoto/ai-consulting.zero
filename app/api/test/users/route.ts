import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@supabase/supabase-js"

/**
 * テスト用：実在するユーザーIDを取得
 *
 * 使用例: http://localhost:3000/api/test/users
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase環境変数が設定されていません")
    }

    // Service Role Key を使用してクライアント作成
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // profilesテーブルから取得（正しいカラム名を使用）
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, name, email, company_id")
      .limit(5)

    if (profilesError) {
      throw profilesError
    }

    return NextResponse.json({
      success: true,
      count: profiles?.length || 0,
      users: profiles || [],
      note: "Use any user_id from the list above for testing",
      example:
        profiles && profiles.length > 0
          ? {
              user_id: profiles[0].user_id,
              name: profiles[0].name,
            }
          : null,
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
