import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { convertPdfBufferToPngBuffer } from "@/lib/ocr/pdf-to-png"

export const runtime = "nodejs"

// 名刺情報のZodスキーマ定義（参考コードに合わせて調整）
const businessCardSchema = z.object({
  fullName: z.string().optional().describe("名刺に記載されている氏名（フルネーム）"),
  position: z.string().optional().describe("役職（代表取締役、部長、課長など）"),
  department: z.string().optional().describe("部署名"),
  email: z.string().optional().describe("メールアドレス"),
  phone: z.string().optional().describe("電話番号"),
  companyName: z.string().optional().describe("会社名"),
  postalCode: z.string().optional().describe("郵便番号（〒マークの後の数字）"),
  address: z.string().optional().describe("住所（都道府県から始まる完全な住所）"),
  website: z.string().optional().describe("ウェブサイトURL"),
  corporateNumber: z.string().optional().describe("法人番号（あれば）"),
  // フロントエンドとの互換性のため、既存のフィールド名も追加
  personName: z.string().optional().describe("氏名（漢字）"),
  personNameKana: z.string().optional().describe("氏名（カタカナ）"),
  mobile: z.string().optional().describe("携帯電話番号"),
})

export async function POST(request: Request) {
  console.log("🚀 OCR API Route called at:", new Date().toISOString())

  try {
    // 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("❌ 認証エラー:", authError)
      return NextResponse.json(
        { error: "認証されていません", details: authError?.message },
        { status: 401 }
      )
    }

    console.log("✅ 認証成功:", {
      userId: user.id,
      email: user.email,
    })

    // リクエストボディから画像データを取得
    let requestBody: { image?: string; mimeType?: string }
    try {
      requestBody = await request.json()
    } catch (parseError) {
      console.error("❌ JSON解析エラー:", parseError)
      return NextResponse.json(
        {
          error: "リクエストの解析に失敗しました",
          details:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        },
        { status: 400 }
      )
    }

    const { image, mimeType } = requestBody

    if (!image) {
      console.error("❌ 画像データがありません")
      return NextResponse.json(
        { error: "画像データが必要です" },
        { status: 400 }
      )
    }

    // 環境変数の確認
    const apiKey = process.env.ANTHROPIC_API_KEY
    const hasApiKey = apiKey && apiKey.trim() !== ""

    console.log("=== OCR API Debug Info ===")
    console.log("Has ANTHROPIC_API_KEY:", hasApiKey ? "Yes" : "No")
    console.log("Image data length:", image.length)

    if (!hasApiKey) {
      console.warn(
        "⚠️ ANTHROPIC_API_KEY環境変数が設定されていません。モックデータを使用します。"
      )
      // フォールバック: モックデータを返す
      const mockResult = {
        fullName: "田中 一郎",
        personName: "田中 一郎",
        personNameKana: "タナカ イチロウ",
        position: "営業部長",
        department: "営業部",
        companyName: "株式会社テックソリューションズ",
        email: "tanaka@techsolutions.co.jp",
        phone: "03-1234-5678",
        mobile: "090-1234-5678",
        postalCode: "150-0001",
        address: "東京都渋谷区恵比寿1-1-1",
        website: "https://techsolutions.co.jp",
      }
      return NextResponse.json({ data: mockResult })
    }

    try {
      // Anthropicクライアントを作成（テストスクリプトと同じ方法）
      const anthropic = createAnthropic({
        apiKey: apiKey!,
      })

      console.log("🔗 Anthropic Claude APIに接続中...")
      console.log("📸 画像をAnthropic Claude APIに送信します...")
      const isPdf = (mimeType || "").toLowerCase().includes("pdf")
      console.log("📊 画像データ情報:", {
        imageLength: image.length,
        mimeType: mimeType || "image/jpeg",
        isPdf,
        estimatedSizeKB: Math.round(image.length * 0.75 / 1024), // base64は約1.33倍なので0.75で概算
      })

      const startTime = Date.now()

      // generateObjectを使用して構造化データを取得（テストスクリプトと同じロジック）
      // タイムアウトを60秒に設定（画像処理には時間がかかる場合がある）
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("OCR処理がタイムアウトしました（60秒）")), 60000)
      })

      console.log("📤 generateObjectを呼び出します...")
      // PDFはClaudeが直接受け付けないため、先にPNGへ変換する
      let imageBuffer: Buffer
      let mediaTypeForClaude: "image/jpeg" | "image/png" | "image/gif" | "image/webp"

      if (isPdf) {
        try {
          const pdfBuffer = Buffer.from(image, "base64")
          const pngBuffer = await convertPdfBufferToPngBuffer(pdfBuffer, { page: 1, scaleTo: 2048 })
          imageBuffer = pngBuffer
          mediaTypeForClaude = "image/png"
        } catch (pdfError) {
          const errorMsg = pdfError instanceof Error ? pdfError.message : String(pdfError)
          console.error("❌ PDF変換エラー:", errorMsg)
          
          // Vercel環境でpoppler-utilsが利用できない場合のエラー
          if (errorMsg.includes("pdftoppm") || errorMsg.includes("poppler") || errorMsg.includes("ENOENT") || errorMsg.includes("spawn")) {
            return NextResponse.json(
              {
                error: "PDF処理が現在利用できません",
                details: "PDFファイルの処理にはシステムツールが必要ですが、現在の環境では利用できません。JPEGまたはPNG形式の画像でアップロードしてください。",
              },
              { status: 503 }
            )
          }
          
          // その他のPDF変換エラー
          return NextResponse.json(
            {
              error: "PDFファイルの変換に失敗しました",
              details: errorMsg,
            },
            { status: 500 }
          )
        }
      } else {
        imageBuffer = Buffer.from(image, "base64")
        const mt = (mimeType || "image/jpeg").toLowerCase()
        if (mt.includes("png")) mediaTypeForClaude = "image/png"
        else if (mt.includes("gif")) mediaTypeForClaude = "image/gif"
        else if (mt.includes("webp")) mediaTypeForClaude = "image/webp"
        else mediaTypeForClaude = "image/jpeg"
      }

      const generatePromise = generateObject({
        model: anthropic("claude-sonnet-4-5-20250929"),
        schema: businessCardSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `この名刺画像から情報を抽出してください。日本語の名刺です。

読み取れる情報のみを抽出し、読み取れない項目は空のままにしてください。
郵便番号は「〒」マークの後の数字（例: 453-0012）を抽出してください。
住所は都道府県から始まる完全な形式で抽出してください。`,
              },
              {
                type: "image",
                image: imageBuffer,
                mediaType: mediaTypeForClaude,
              },
            ],
          },
        ],
      })

      console.log("⏳ generateObjectの完了を待機中...")
      const generateResult = await Promise.race([generatePromise, timeoutPromise]) as { object: any }
      const { object } = generateResult
      console.log("✅ generateObjectが完了しました")

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log("✅ Claude API response received")
      console.log("⏱️ API応答時間:", duration, "ms")
      console.log("📋 抽出された情報:", JSON.stringify(object, null, 2))

      // fullNameとpersonNameの互換性を確保
      const ocrResult = {
        ...object,
        personName: object.fullName || object.personName,
        personNameKana: object.personNameKana,
      }

      // 結果を返す（テストスクリプトと同じ形式）
      return NextResponse.json({ data: ocrResult })
    } catch (claudeError) {
      console.error("❌ Claude API error:", claudeError)
      console.error("❌ Error type:", typeof claudeError)
      console.error("❌ Error constructor:", claudeError?.constructor?.name)
      
      if (claudeError instanceof Error) {
        console.error("Error name:", claudeError.name)
        console.error("Error message:", claudeError.message)
        console.error("Error stack:", claudeError.stack)
        
        // エラーの詳細をJSON形式で出力（オブジェクトの場合）
        try {
          const errorDetails = JSON.stringify(claudeError, Object.getOwnPropertyNames(claudeError), 2)
          console.error("Error details (JSON):", errorDetails)
        } catch (e) {
          console.error("Error details (string):", String(claudeError))
        }

        // よくあるエラーの説明を追加
        if (
          claudeError.message.includes("401") ||
          claudeError.message.includes("authentication") ||
          claudeError.message.includes("Unauthorized")
        ) {
          console.error("💡 ヒント: ANTHROPIC_API_KEYが無効です")
          console.error("   環境変数ANTHROPIC_API_KEYを確認してください")
          return NextResponse.json(
            {
              error: "API認証エラーが発生しました",
              details: "ANTHROPIC_API_KEYが無効です。環境変数を確認してください。",
            },
            { status: 401 }
          )
        } else if (claudeError.message.includes("429") || claudeError.message.includes("rate limit")) {
          console.error("💡 ヒント: APIレート制限に達しました")
          console.error("   しばらく待ってから再度お試しください")
          return NextResponse.json(
            {
              error: "APIの利用制限に達しました",
              details: "しばらく待ってから再度お試しください。",
            },
            { status: 429 }
          )
        } else if (
          claudeError.message.includes("network") ||
          claudeError.message.includes("ECONNREFUSED") ||
          claudeError.message.includes("fetch failed") ||
          claudeError.message.includes("タイムアウト")
        ) {
          console.error("💡 ヒント: ネットワークエラーが発生しました")
          console.error("   インターネット接続を確認してください")
          return NextResponse.json(
            {
              error: "ネットワークエラーが発生しました",
              details: "インターネット接続を確認してください。",
            },
            { status: 503 }
          )
        } else if (claudeError.message.includes("Invalid image") || claudeError.message.includes("image")) {
          console.error("💡 ヒント: 画像データが無効です")
          return NextResponse.json(
            {
              error: "画像データの形式が正しくありません",
              details: "JPEGまたはPNG形式の画像をアップロードしてください。",
            },
            { status: 400 }
          )
        } else if (
          claudeError.message.includes("Unsupported model version") ||
          claudeError.message.includes("specification version") ||
          claudeError.message.includes("v1") ||
          claudeError.message.includes("v2")
        ) {
          console.error("💡 ヒント: モデルバージョンの問題です")
          console.error("   AI SDK 5はv2仕様のモデルのみをサポートしています")
          return NextResponse.json(
            {
              error: "モデルバージョンの問題が発生しました",
              details: "AI SDK 5はv2仕様のモデルのみをサポートしています。モデル名を確認してください。",
            },
            { status: 500 }
          )
        }
      }

      // その他のエラーを返す
      return NextResponse.json(
        {
          error: "名刺の読み取りに失敗しました",
          details:
            claudeError instanceof Error
              ? claudeError.message
              : String(claudeError),
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("OCR processing error:", error)
    return NextResponse.json(
      {
        error: "OCR処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
