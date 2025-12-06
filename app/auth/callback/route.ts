import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/auth/complete-profile"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // メール確認成功 - プロフィール登録画面にリダイレクト
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // エラーまたはコードがない場合はログインページにリダイレクト
  return NextResponse.redirect(new URL("/auth/login", request.url))
}



