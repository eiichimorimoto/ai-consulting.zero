/**
 * PDFファイルでOCR機能をテストするスクリプト
 * ClaudeDesign1220のOCRモジュールを使用
 */

import * as fs from "fs"
import * as path from "path"
import { analyzeBusinessCard } from "../lib/ocr/ocr-service"

async function testOCRPDF(pdfPath: string) {
  console.log("🧪 PDF OCRテストを開始します...")
  console.log("📁 PDFファイル:", pdfPath)

  // 環境変数の確認
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY環境変数が設定されていません")
    process.exit(1)
  }

  console.log("✅ APIキーが設定されています")

  // ファイルの存在確認
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ ファイルが見つかりません: ${pdfPath}`)
    process.exit(1)
  }

  // ファイルを読み込んでBufferとして保持
  const fileBuffer = fs.readFileSync(pdfPath)

  console.log("✅ PDFファイルを読み込みました")
  console.log("   ファイルサイズ:", fileBuffer.length, "バイト")

  // Base64にエンコード
  const base64Data = fileBuffer.toString("base64")

  try {
    console.log("🔗 Anthropic Claude APIに接続中...")

    const startTime = Date.now()

    // OCR解析を実行
    const result = await analyzeBusinessCard(base64Data, "application/pdf")

    const endTime = Date.now()
    const duration = endTime - startTime

    if (!result.success || !result.data) {
      console.error("❌ OCR処理でエラーが発生しました:")
      console.error("   エラー:", result.error)
      process.exit(1)
    }

    console.log("✅ OCR処理が完了しました！")
    console.log("⏱️  処理時間:", duration, "ms")
    console.log("\n📋 抽出された情報:")
    console.log("==========================================")
    console.log(JSON.stringify(result.data, null, 2))
    console.log("==========================================")

    // フォーマット済みの結果も表示
    console.log("\n📄 フォーマット済み結果:")
    console.log("==========================================")
    console.log(formatResult(result.data))
    console.log("==========================================")

    return result.data
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

function formatResult(data: any): string {
  const lines: string[] = []

  lines.push("## 名刺OCR解析結果\n")

  // 基本情報
  lines.push("### 基本情報\n")
  lines.push(`| 項目 | 日本語 | 英語 |`)
  lines.push(`|------|--------|------|`)
  lines.push(`| **氏名** | ${data.person.nameJa} | ${data.person.nameEn || "-"} |`)
  lines.push(`| **会社名** | ${data.company.nameJa} | ${data.company.nameEn || "-"} |`)
  if (data.company.abbreviation) {
    lines.push(`| **略称** | ${data.company.abbreviation} | - |`)
  }

  // 部署情報
  if (data.departments && data.departments.length > 0) {
    lines.push("\n### 所属部署\n")
    lines.push(`| 日本語 | 英語 |`)
    lines.push(`|--------|------|`)
    data.departments.forEach((dept: any) => {
      lines.push(`| ${dept.ja} | ${dept.en || "-"} |`)
    })
  }

  // 連絡先
  lines.push("\n### 連絡先情報\n")
  lines.push(`| 項目 | 内容 |`)
  lines.push(`|------|------|`)
  if (data.contact.email) {
    lines.push(`| **メール** | ${data.contact.email} |`)
  }
  if (data.contact.tel) {
    lines.push(`| **TEL** | ${data.contact.tel} |`)
  }
  if (data.contact.fax) {
    lines.push(`| **FAX** | ${data.contact.fax} |`)
  }
  if (data.contact.mobile) {
    lines.push(`| **携帯** | ${data.contact.mobile} |`)
  }
  if (data.contact.url) {
    lines.push(`| **URL** | ${data.contact.url} |`)
  }

  // 住所情報
  if (data.addresses && data.addresses.length > 0) {
    lines.push("\n### 拠点情報\n")
    data.addresses.forEach((addr: any) => {
      lines.push(`**${addr.name}**`)
      if (addr.postalCode) {
        lines.push(`郵便番号: 〒${addr.postalCode.replace("〒", "")}`)
      }
      if (addr.addressJa) {
        lines.push(`住所（日本語）: ${addr.addressJa}`)
      }
      if (addr.addressEn) {
        lines.push(`住所（英語）: ${addr.addressEn}`)
      }
      lines.push("")
    })
  }

  // 信頼度
  if (data.confidence) {
    lines.push(`\n**解析信頼度**: ${Math.round(data.confidence * 100)}%`)
  }

  return lines.join("\n")
}

// メイン処理
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log("使い方: npx tsx scripts/test-ocr-pdf.ts <PDFファイルのパス>")
  console.log("例: npx tsx scripts/test-ocr-pdf.ts ./info-data/sample.pdf")
  process.exit(1)
}

const pdfPath = args[0]
testOCRPDF(pdfPath)
  .then(() => {
    console.log("\n✅ テスト完了")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ テスト失敗:", error)
    process.exit(1)
  })
