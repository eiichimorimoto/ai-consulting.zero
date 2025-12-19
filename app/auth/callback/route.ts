import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { appendFile } from "fs/promises"
import { join } from "path"

const LOG_FILE = join(process.cwd(), '.cursor', 'debug.log')
const logToFile = async (data: any) => {
  try {
    await appendFile(LOG_FILE, JSON.stringify(data) + '\n', 'utf8')
  } catch (e) {}
}

export async function GET(request: Request) {
  // #region agent log
  await logToFile({location:'app/auth/callback/route.ts:5',message:'callback entry',data:{fullUrl:request.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const requestedNext = requestUrl.searchParams.get("next")
  // セキュリティ: open redirect防止（アプリ内パスのみ許可）
  const next = requestedNext && requestedNext.startsWith("/") ? requestedNext : "/auth/complete-profile"

  // #region agent log
  await logToFile({location:'app/auth/callback/route.ts:12',message:'params extracted',data:{hasCode:!!code,codeValue:code?.substring(0,20)+'...',requestedNext,finalNext:next},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion

  console.log('[auth/callback] Received request:', {
    code: code ? 'present' : 'missing',
    requestedNext,
    finalNext: next,
    fullUrl: requestUrl.toString()
  })

  if (!code) {
    // #region agent log
    await logToFile({location:'app/auth/callback/route.ts:22',message:'no code redirecting to login',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
    // #endregion
    console.warn('[auth/callback] No code parameter found, redirecting to login')
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // codeがある場合、セッション交換を試行
  const supabase = await createClient()
  // #region agent log
  await logToFile({location:'app/auth/callback/route.ts:28',message:'before exchangeCodeForSession',data:{codeLength:code.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  
  // #region agent log
  await logToFile({location:'app/auth/callback/route.ts:30',message:'after exchangeCodeForSession',data:{hasError:!!error,errorMessage:error?.message,hasData:!!data,hasUser:!!data?.user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  
  if (error) {
    // #region agent log
    await logToFile({location:'app/auth/callback/route.ts:33',message:'exchange error redirecting to login',data:{errorMessage:error.message,errorStatus:error.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
    // #endregion
    console.error('[auth/callback] Session exchange error:', {
      message: error.message,
      status: error.status,
      name: error.name
    })
    // エラー時はログインページにリダイレクト
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // セッション交換成功
  // #region agent log
  await logToFile({location:'app/auth/callback/route.ts:44',message:'success redirecting to profile',data:{next,userId:data?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  console.log('[auth/callback] Session exchange successful, redirecting to:', next)
  console.log('[auth/callback] User authenticated:', {
    userId: data?.user?.id,
    email: data?.user?.email
  })
  
  // メール確認成功 - 個人情報・会社情報入力画面（プロフィール/OCR画面）にリダイレクト
  return NextResponse.redirect(new URL(next, request.url))
}



