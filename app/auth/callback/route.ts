import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const requestedNext = requestUrl.searchParams.get("next")
  // セキュリティ: open redirect防止（アプリ内パスのみ許可）
  const next = requestedNext && requestedNext.startsWith("/") ? requestedNext : "/auth/complete-profile"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // メール確認成功 - 個人情報・会社情報入力画面にリダイレクト
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // エラーまたはコードがない場合はログインページにリダイレクト
  return NextResponse.redirect(new URL("/auth/login", request.url))
}



