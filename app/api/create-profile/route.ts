import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

// Service Roleキーを使用してRLSをバイパスするクライアントを作成
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("⚠️ Service Role Keyが設定されていません。通常のクライアントを使用します。")
    return null
  }

  return createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: Request) {
  console.log("🔵 [create-profile API] Request received")
  
  try {
    // まず通常のクライアントを試す
    const supabase = await createClient()
    console.log("🔵 [create-profile API] Supabase client created")
    
    // Service Roleクライアントも作成（RLSバイパス用）
    const serviceClient = createServiceRoleClient()
    const useServiceClient = !!serviceClient
    console.log("🔵 [create-profile API] Service Role client:", useServiceClient ? "Available" : "Not available")
    
    // リクエストボディからユーザーIDを取得（サインアップ直後はセッションが確立されていない可能性があるため）
    let requestBody: { userId?: string; email?: string; name?: string } = {}
    try {
      requestBody = await request.json()
      console.log("🔵 [create-profile API] Request body:", {
        hasUserId: !!requestBody.userId,
        userId: requestBody.userId,
        email: requestBody.email,
      })
    } catch (parseError) {
      console.warn("⚠️ [create-profile API] Failed to parse request body:", parseError)
      // リクエストボディがない場合は認証から取得を試みる
      // 空のリクエストボディも許容する
    }
    
    // 認証されているユーザーを取得（サインアップ直後はnullになる可能性がある）
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    console.log("🔵 [create-profile API] Auth check:", {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
    })

    // ユーザーIDを決定（リクエストボディから、または認証から）
    const userId = requestBody.userId || user?.id

    if (!userId) {
      console.error("❌ [create-profile API] User ID not found. Auth error:", authError, "Request body:", requestBody)
      return NextResponse.json(
        { 
          error: "認証されていません", 
          details: authError?.message || "ユーザーIDが取得できませんでした",
          code: "AUTH_ERROR"
        },
        { status: 401 }
      )
    }

    console.log("🔵 [create-profile API] Creating profile for user:", userId)

    // 既にプロファイルが存在するか確認（トリガー関数で作成された可能性がある）
    // Service Roleクライアントを使用してRLSをバイパス
    console.log("🔵 [create-profile API] Checking if profile exists...")
    const checkClient = serviceClient || supabase
    const { data: existingProfile, error: checkError } = await checkClient
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single()

    console.log("🔵 [create-profile API] Profile check result:", {
      hasProfile: !!existingProfile,
      profileId: existingProfile?.id,
      checkError: checkError?.message,
      checkErrorCode: checkError?.code,
      usedServiceClient: useServiceClient,
    })

    // チェックエラーは無視（プロファイルが存在しない場合もエラーになるため）
    if (existingProfile) {
      console.log("✅ [create-profile API] Profile already exists (likely created by trigger):", existingProfile)
      return NextResponse.json(
        { 
          message: "プロファイルは既に存在します", 
          profile: existingProfile,
          code: "PROFILE_EXISTS"
        },
        { status: 200 }
      )
    }

    console.log("🔵 [create-profile API] Profile does not exist, attempting to create...")

    // プロファイルが存在しない場合のみ作成を試みる
    // ただし、RLSポリシー違反が発生する可能性があるため、エラーを適切に処理する
    const userEmail = user?.email || requestBody.email || ""
    const userName = user?.user_metadata?.name || requestBody.name || userEmail.split("@")[0] || "User"

    console.log("🔵 [create-profile API] Attempting to create profile with:", {
      userId,
      userName,
      userEmail,
      useServiceClient,
    })

    // Service Roleクライアントが利用可能な場合のみプロファイルを作成を試みる
    // 利用できない場合は、トリガー関数に任せる
    if (!serviceClient) {
      console.warn("⚠️ [create-profile API] Service Role Keyが設定されていません。トリガー関数にプロファイル作成を任せます。")
      
      // トリガー関数でプロファイルが作成されるまで少し待って確認
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const finalCheckClient = supabase
      const { data: finalProfile } = await finalCheckClient
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single()

      if (finalProfile) {
        console.log("✅ [create-profile API] Profile created by trigger function:", finalProfile)
        return NextResponse.json(
          { 
            message: "プロファイルはトリガー関数により作成されました", 
            profile: finalProfile,
            code: "PROFILE_CREATED_BY_TRIGGER"
          },
          { status: 200 }
        )
      } else {
        // トリガー関数でも作成されていない場合、Service Role Keyの設定を促す
        return NextResponse.json(
          { 
            error: "プロファイルの作成に失敗しました",
            details: "Service Role Keyが設定されていないため、プロファイルを作成できません。.env.localにSUPABASE_SERVICE_ROLE_KEYを設定してください。",
            code: "SERVICE_ROLE_KEY_REQUIRED",
            hint: "トリガー関数が正常に動作していない可能性があります。Supabaseダッシュボードでトリガー関数を確認してください。",
          },
          { status: 500 }
        )
      }
    }

    // Service Roleクライアントを使用してプロファイルを作成（RLSをバイパス）
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .insert({
        user_id: userId,
        name: userName,
        email: userEmail,
      })
      .select()
      .single()

    if (profileError) {
      console.error("❌ [create-profile API] Profile creation error:", {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      })
      
      // エラーが発生した場合でも、トリガー関数が作成している可能性があるため再確認
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const retryCheckClient = serviceClient
      const { data: retryProfile } = await retryCheckClient
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single()

      if (retryProfile) {
        console.log("✅ [create-profile API] Profile exists after error (created by trigger):", retryProfile)
        return NextResponse.json(
          { message: "プロファイルは既に存在します", profile: retryProfile },
          { status: 200 }
        )
      }
      
      return NextResponse.json(
        { 
          error: "プロファイルの作成に失敗しました",
          details: profileError.message || "不明なエラーが発生しました",
          code: profileError.code || "UNKNOWN_ERROR",
          hint: profileError.hint,
          debugInfo: {
            userId,
            errorCode: profileError.code,
            errorMessage: profileError.message,
          },
        },
        { status: 500 }
      )
    }

    console.log("✅ [create-profile API] Profile created successfully:", profile)

    // サブスクリプションも確認・作成
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (!existingSub) {
      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_type: "free",
          status: "active",
        })

      if (subError) {
        console.error("Subscription creation error:", subError)
        // サブスクリプションのエラーは警告のみ（プロファイルは作成済み）
      }
    }

    return NextResponse.json(
      { message: "プロファイルを作成しました", profile },
      { status: 201 }
    )
  } catch (error) {
    console.error("❌ [create-profile API] Unexpected error:", error)
    
    // エラー情報を詳細に記録
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    }
    
    console.error("❌ [create-profile API] Error details:", JSON.stringify(errorDetails, null, 2))
    
    return NextResponse.json(
      { 
        error: "予期しないエラーが発生しました",
        details: errorDetails.message,
        code: "UNEXPECTED_ERROR",
        errorType: errorDetails.name,
        stack: errorDetails.stack,
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

