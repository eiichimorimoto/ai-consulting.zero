import { updateSession } from "./lib/supabase/proxy"
import { NextResponse, type NextRequest } from "next/server"

// Edge Runtimeではファイルシステムへの書き込みができないため、コンソールログのみ使用
const logToConsole = async (data: any) => {
  console.log("[middleware]", JSON.stringify(data))
}

export async function proxy(request: NextRequest) {
  // Supabaseのメール確認（PKCE）の戻り先がトップ(/)になってしまっても、
  // `?code=` が付いていれば /auth/callback に渡してセッション交換→プロフィール入力へ遷移させる。
  const url = request.nextUrl
  const code = url.searchParams.get("code")

  await logToConsole({
    location: "middleware.ts",
    message: "middleware entry",
    data: { pathname: url.pathname, search: url.search, hasCode: !!code },
    timestamp: Date.now(),
  })

  // トップページにcodeパラメータがある場合、/auth/callbackにリダイレクト
  if (url.pathname === "/" && code) {
    const nextParam = url.searchParams.get("next") || "/auth/complete-profile"
    const safeNext = nextParam.startsWith("/") ? nextParam : "/auth/complete-profile"
    const redirectUrl = new URL("/auth/callback", url.origin)
    redirectUrl.searchParams.set("code", code)
    redirectUrl.searchParams.set("next", safeNext)
    return NextResponse.redirect(redirectUrl)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabaseが設定されていない場合は通常のレスポンスを返す
    return NextResponse.next()
  }

  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
