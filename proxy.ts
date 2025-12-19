import { updateSession } from "./lib/supabase/proxy"
import { NextResponse, type NextRequest } from "next/server"
import { writeFile, appendFile } from "fs/promises"
import { join } from "path"

const LOG_FILE = join(process.cwd(), '.cursor', 'debug.log')
const logToFile = async (data: any) => {
  try {
    await appendFile(LOG_FILE, JSON.stringify(data) + '\n', 'utf8')
  } catch (e) {}
}

export async function proxy(request: NextRequest) {
  // #region agent log
  await logToFile({location:'proxy.ts:7',message:'proxy entry',data:{pathname:request.nextUrl.pathname,search:request.nextUrl.search,allParams:Object.fromEntries(request.nextUrl.searchParams)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'});
  // #endregion
  // Supabaseのメール確認（PKCE）の戻り先がトップ(/)になってしまっても、
  // `?code=` が付いていれば /auth/callback に渡してセッション交換→プロフィール(OCR)へ遷移させる。
  const url = request.nextUrl
  const code = url.searchParams.get("code")
  
  // #region agent log
  await logToFile({location:'proxy.ts:12',message:'code check',data:{hasCode:!!code,codeValue:code?.substring(0,20)+'...',pathname:url.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
  // #endregion
  
  // トップページにcodeパラメータがある場合、/auth/callbackにリダイレクト
  if (url.pathname === "/" && code) {
    const nextParam = url.searchParams.get("next") || "/auth/complete-profile"
    const safeNext = nextParam.startsWith("/") ? nextParam : "/auth/complete-profile"
    const redirectUrl = new URL("/auth/callback", url.origin)
    redirectUrl.searchParams.set("code", code)
    redirectUrl.searchParams.set("next", safeNext)
    // #region agent log
    await logToFile({location:'proxy.ts:20',message:'redirecting to callback',data:{redirectUrl:redirectUrl.toString(),safeNext,codeLength:code.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
    // #endregion
    console.log('[proxy] Redirecting to /auth/callback with code:', {
      hasCode: !!code,
      next: safeNext,
      redirectUrl: redirectUrl.toString()
    })
    return NextResponse.redirect(redirectUrl)
  }
  
  // トップページにcodeパラメータがない場合もログに記録（Supabaseがcodeを付けてリダイレクトしていない可能性）
  if (url.pathname === "/" && !code) {
    // #region agent log
    await logToFile({location:'proxy.ts:34',message:'top page without code',data:{search:url.search,allParams:Object.fromEntries(url.searchParams)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'});
    // #endregion
  }
  
  // /auth/callbackパス自体にもcodeパラメータがない場合のチェック（念のため）
  if (url.pathname === "/auth/callback" && !code) {
    // #region agent log
    await logToFile({location:'proxy.ts:29',message:'callback without code',data:{pathname:url.pathname,search:url.search},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
    // #endregion
    console.warn('[proxy] /auth/callback accessed without code parameter')
    // codeがない場合はそのまま進める（callback routeで処理）
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



