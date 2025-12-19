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
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const requestedNext = requestUrl.searchParams.get("next")
  const urlError = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  
  // デバッグログ: リクエストの詳細を記録
  const debugInfo = {
    fullUrl: request.url,
    pathname: requestUrl.pathname,
    hasCode: !!code,
    codeLength: code?.length || 0,
    requestedNext,
    hasError: !!urlError,
    error: urlError,
    errorDescription,
    allParams: Object.fromEntries(requestUrl.searchParams)
  }
  
  // #region agent log
  await logToFile({location:'app/auth/callback/route.ts:13',message:'callback entry',data:debugInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  
  console.log('[auth/callback] ===== CALLBACK ENTRY =====')
  console.log('[auth/callback] Full URL:', request.url)
  console.log('[auth/callback] Pathname:', requestUrl.pathname)
  console.log('[auth/callback] Code:', code ? `present (${code.length} chars)` : 'missing')
  console.log('[auth/callback] Next param:', requestedNext || 'not provided')
  console.log('[auth/callback] Error:', urlError || 'none')
  console.log('[auth/callback] Error description:', errorDescription || 'none')
  console.log('[auth/callback] All params:', Object.fromEntries(requestUrl.searchParams))
  
  // エラーパラメータがある場合（例: code期限切れ）
  if (urlError) {
    console.error('[auth/callback] Error parameter detected:', {
      error: urlError,
      errorDescription
    })
    // #region agent log
    await logToFile({location:'app/auth/callback/route.ts:35',message:'error parameter detected',data:{error:urlError,errorDescription},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
    // #endregion
    
    // エラーの種類によってリダイレクト先を決定
    if (urlError === 'access_denied' || errorDescription?.includes('expired') || errorDescription?.includes('invalid')) {
      console.warn('[auth/callback] Code expired or invalid, redirecting to login')
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }
  
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
    await logToFile({location:'app/auth/callback/route.ts:33',message:'exchange error',data:{errorMessage:error.message,errorStatus:error.status,errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
    // #endregion
    console.error('[auth/callback] Session exchange error:', {
      message: error.message,
      status: error.status,
      name: error.name
    })
    
    // エラーの種類によってリダイレクト先を決定
    // codeが無効または期限切れの場合、ログインページにリダイレクト
    // ただし、新規登録のメール確認の場合、プロフィール画面に遷移させる
    const errorMessage = error.message.toLowerCase()
    if (errorMessage.includes('expired') || errorMessage.includes('invalid') || errorMessage.includes('code')) {
      console.warn('[auth/callback] Code expired or invalid, redirecting to login')
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
    
    // その他のエラーの場合もログインページにリダイレクト
    console.warn('[auth/callback] Unknown error, redirecting to login')
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // セッション交換成功
  // #region agent log
  await logToFile({location:'app/auth/callback/route.ts:44',message:'session exchange success',data:{userId:data?.user?.id,email:data?.user?.email,emailConfirmed:data?.user?.email_confirmed_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  console.log('[auth/callback] Session exchange successful')
  console.log('[auth/callback] User authenticated:', {
    userId: data?.user?.id,
    email: data?.user?.email,
    emailConfirmed: data?.user?.email_confirmed_at,
    createdAt: data?.user?.created_at
  })
  
  // プロフィールの状態を確認
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, company_id')
    .eq('user_id', data.user.id)
    .single()
  
  console.log('[auth/callback] Profile check:', {
    hasProfile: !!profile,
    profileName: profile?.name,
    hasCompanyId: !!profile?.company_id,
    profileError: profileError?.message
  })
  
  // プロフィールが未完成の場合（nameが'User'またはcompany_idが存在しない）はプロフィール登録画面へ
  // 新規登録の場合は必ずプロフィール登録画面へ
  const isProfileIncomplete = !profile || !profile.name || profile.name === 'User' || !profile.company_id
  
  if (isProfileIncomplete) {
    console.log('[auth/callback] Profile incomplete, redirecting to complete-profile', {
      hasProfile: !!profile,
      profileName: profile?.name,
      hasCompanyId: !!profile?.company_id
    })
    // #region agent log
    await logToFile({location:'app/auth/callback/route.ts:66',message:'redirecting to complete-profile',data:{isProfileIncomplete,hasProfile:!!profile,profileName:profile?.name,hasCompanyId:!!profile?.company_id,reason:'profile incomplete'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
    // #endregion
    return NextResponse.redirect(new URL("/auth/complete-profile", request.url))
  }
  
  // プロフィールが完成している場合は、リクエストされたnextパラメータまたはダッシュボードへ
  const finalNext = next || "/dashboard"
  console.log('[auth/callback] Profile complete, redirecting to:', finalNext)
  // #region agent log
  await logToFile({location:'app/auth/callback/route.ts:75',message:'redirecting to final destination',data:{finalNext,userId:data?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  
  // メール確認成功 - プロフィールが完成していればダッシュボード、未完成ならプロフィール登録画面へ
  return NextResponse.redirect(new URL(finalNext, request.url))
}



