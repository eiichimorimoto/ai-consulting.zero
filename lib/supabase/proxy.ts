import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 保護されたルートへのアクセス制御
  const protectedPaths = ["/dashboard", "/consulting", "/account"]
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // §8-3: app_status=suspended のユーザーを支払い更新ページへリダイレクト
  // /account/billing 系は許可（支払い更新するため）
  const suspendCheckPaths = ["/dashboard", "/consulting"]
  const needsSuspendCheck = suspendCheckPaths.some((p) => pathname.startsWith(p))

  if (user && needsSuspendCheck) {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("app_status")
      .eq("user_id", user.id)
      .single()

    if (subscription?.app_status === "suspended") {
      const url = request.nextUrl.clone()
      url.pathname = "/account/billing/update-payment"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
