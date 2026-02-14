import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // リクエストボディ
    const { query, conversationId } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 })
    }

    // 環境変数チェック
    const difyApiKey = process.env.DIFY_WORKFLOW_API_KEY
    const difyBaseUrl = process.env.DIFY_API_BASE_URL
    const workflowId = process.env.DIFY_WORKFLOW_ID

    if (!difyApiKey || !difyBaseUrl || !workflowId) {
      console.error("Dify environment variables not set")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Dify Workflow API 呼び出し
    const difyUrl = `${difyBaseUrl}/workflows/run`

    console.log("Calling Dify Workflow:", {
      url: difyUrl,
      userId: user.id,
      workflowId,
    })

    const difyResponse = await fetch(difyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          user_id: user.id, // ← Supabase user_id
          query: query,
        },
        response_mode: "blocking",
        user: user.id,
      }),
    })

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text()
      console.error("Dify API error:", {
        status: difyResponse.status,
        error: errorText,
      })
      return NextResponse.json(
        {
          error: "Dify API call failed",
          details: difyResponse.status, // ← typo 修正: tatus → difyResponse.status
        },
        { status: difyResponse.status }
      )
    }

    const result = await difyResponse.json()

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Dify Workflow Proxy",
    configured: !!(
      process.env.DIFY_WORKFLOW_API_KEY &&
      process.env.DIFY_API_BASE_URL &&
      process.env.DIFY_WORKFLOW_ID
    ),
  })
}
