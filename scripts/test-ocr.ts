import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import * as fs from "fs"
import * as path from "path"

// 名刺情報のZodスキーマ
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
  personName: z.string().optional().describe("氏名（漢字）"),
  personNameKana: z.string().optional().describe("氏名（カタカナ）"),
  mobile: z.string().optional().describe("携帯電話番号"),
})

async function testOCR(imagePath: string) {
  console.log("🧪 OCRテストを開始します...")
  console.log("📁 画像ファイル:", imagePath)

  // 環境変数の確認
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY環境変数が設定されていません")
    process.exit(1)
  }

  console.log("✅ APIキーが設定されています")

  // ファイルの存在確認
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ ファイルが見つかりません: ${imagePath}`)
    process.exit(1)
  }

  // ファイルを読み込んでBufferとして保持
  const fileBuffer = fs.readFileSync(imagePath)

  console.log("✅ 画像ファイルを読み込みました")
  console.log("   ファイルサイズ:", fileBuffer.length, "バイト")

  // MIMEタイプの判定
  const ext = path.extname(imagePath).toLowerCase()
  let mimeType = "image/jpeg"
  if (ext === ".png") mimeType = "image/png"
  else if (ext === ".gif") mimeType = "image/gif"
  else if (ext === ".webp") mimeType = "image/webp"
  else if (ext === ".pdf") mimeType = "application/pdf"

  console.log("📄 MIMEタイプ:", mimeType)

  try {
    // Anthropicクライアントを作成
    const anthropic = createAnthropic({
      apiKey: apiKey,
    })

    console.log("🔗 Anthropic Claude APIに接続中...")

    const startTime = Date.now()

    // generateObjectを使用して構造化データを取得
    const { object } = await generateObject({
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
              image: fileBuffer,
              mediaType: mimeType,
            },
          ],
        },
      ],
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log("✅ OCR処理が完了しました！")
    console.log("⏱️  処理時間:", duration, "ms")
    console.log("\n📋 抽出された情報:")
    console.log("==========================================")
    console.log(JSON.stringify(object, null, 2))
    console.log("==========================================")

    return object
  } catch (error) {
    console.error("❌ OCR処理でエラーが発生しました:")
    if (error instanceof Error) {
      console.error("   エラーメッセージ:", error.message)
      console.error("   エラー詳細:", error)
    } else {
      console.error("   エラー:", error)
    }
    process.exit(1)
  }
}

// メイン処理
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log("使い方: npx tsx scripts/test-ocr.ts <画像ファイルのパス>")
  console.log("例: npx tsx scripts/test-ocr.ts ./sample.jpg")
  process.exit(1)
}

const imagePath = args[0]
testOCR(imagePath)
  .then(() => {
    console.log("\n✅ テスト完了")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ テスト失敗:", error)
    process.exit(1)
  })





