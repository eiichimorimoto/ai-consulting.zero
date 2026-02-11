import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { convertPdfBufferToPngBuffer } from "@/lib/ocr/pdf-to-png"
import { checkOCRResult } from "@/lib/fact-checker"

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
      // Claude APIはPDFに対応していないため、PDFを画像に変換してからOCRに掛ける
      let imageBuffer: Buffer
      let mediaTypeForClaude: "image/jpeg" | "image/png" | "image/gif" | "image/webp"

      if (isPdf) {
        // PDFの場合は既にクライアントサイドで画像に変換されているはず
        // 念のためサーバーサイドでも変換を試みる（フォールバック）
        console.log("📄 PDFを検出しました（クライアントサイドで変換済みのはず）")
        try {
        const pdfBuffer = Buffer.from(image, "base64")
        const pngBuffer = await convertPdfBufferToPngBuffer(pdfBuffer, { page: 1, scaleTo: 2048 })
        imageBuffer = pngBuffer
        mediaTypeForClaude = "image/png"
          console.log("✅ PDF→PNG変換完了（サーバーサイドフォールバック）")
        } catch (pdfError) {
          // クライアントサイドで変換済みの場合はそのまま使用
          console.log("⚠️ サーバーサイド変換失敗、クライアントサイド変換済みデータを使用")
          imageBuffer = Buffer.from(image, "base64")
          mediaTypeForClaude = "image/png"
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
                text: `あなたは日本語の名刺OCRの専門家です。この名刺画像から情報を正確に抽出してください。

【重要な注意事項】
1. 画像をよく観察し、文字を1文字ずつ確認してください
2. 似ている文字を混同しないでください:
   - 「0（ゼロ）」と「O（オー）」
   - 「1（いち）」と「l（エル）」と「I（アイ）」
   - 「ー（長音）」と「一（漢数字）」と「-（ハイフン）」
   - 「〒」の後の数字は郵便番号です

【抽出ルール】

■ 会社名（companyName）:
- 「株式会社」「(株)」「㈱」「有限会社」「合同会社」などを含めた正式名称
- ロゴや装飾文字も含めて正確に読み取る
- 英語表記がある場合は日本語名を優先

■ 郵便番号（postalCode）:
- 「〒」マークの後の7桁の数字（XXX-XXXXまたはXXXXXXX形式）
- ハイフンがなくても7桁の数字列を探す
- 必ず半角数字で出力（例: "453-0012"）

■ 住所（address）:
- 都道府県から始まる完全な住所
- 「〒XXX-XXXX」の後に続く文字列を丁寧に読み取る
- ビル名・階数まで含める
- 数字は半角、漢数字は漢数字のまま

■ 電話番号（phone）:
- 「TEL」「電話」「Tel」の後の番号
- 市外局番から始まる固定電話番号
- ハイフン区切りで出力（例: "03-1234-5678"）

■ 携帯電話（mobile）:
- 「携帯」「Mobile」「090」「080」「070」で始まる番号
- 固定電話と区別して抽出

■ 氏名（fullName / personName）:
- 漢字のフルネーム（姓と名の間にスペースを入れる）
- 役職（代表取締役、部長など）は含めない

■ 氏名カナ（personNameKana）:
- カタカナ表記があれば抽出
- なければ空のまま

■ 部署（department）:
- 「〇〇部」「〇〇課」「〇〇事業部」など

■ 役職（position）:
- 「代表取締役」「取締役」「部長」「課長」「マネージャー」など

■ Webサイト（website）:
- 「URL」「HP」「https://」「http://」「www.」で始まる文字列
- ドメイン名のみの場合もあり

■ メールアドレス（email）:
- 「@」を含む文字列
- 「E-mail」「Mail」「メール」の後

【出力形式】
- 読み取れない項目は空のまま（推測しない）
- 数字は半角に統一
- 確信が持てない文字がある場合でも、最も可能性の高い読み取り結果を出力`,
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

      // ファクトチェックを実行
      const factCheckResult = checkOCRResult({
        companyName: ocrResult.companyName,
        personName: ocrResult.personName,
        email: ocrResult.email,
        phone: ocrResult.phone,
        mobile: ocrResult.mobile,
        address: ocrResult.address,
        postalCode: ocrResult.postalCode,
        department: ocrResult.department,
        position: ocrResult.position,
        website: ocrResult.website,
      })

      console.log("📋 ファクトチェック結果:", JSON.stringify(factCheckResult, null, 2))

      // 利用カウント加算（OCR 成功時）
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("monthly_ocr_count")
        .eq("id", user.id)
        .single()
      const nextOcrCount = (profileRow?.monthly_ocr_count ?? 0) + 1
      await supabase
        .from("profiles")
        .update({ monthly_ocr_count: nextOcrCount })
        .eq("id", user.id)

      // 結果を返す（ファクトチェック結果を含む）
      return NextResponse.json({ 
        data: ocrResult,
        factCheck: factCheckResult
      })
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
