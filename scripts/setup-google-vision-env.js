#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

// コマンドライン引数からJSONファイルのパスを取得
const jsonFilePath = process.argv[2]

if (!jsonFilePath) {
  console.error("使用方法: node scripts/setup-google-vision-env.js <JSONファイルのパス>")
  console.error(
    "例: node scripts/setup-google-vision-env.js ~/Downloads/ai-consulting-ocr-xxxxx.json"
  )
  process.exit(1)
}

// ファイルパスを解決（~を展開）
const resolvedPath = jsonFilePath.startsWith("~")
  ? path.join(process.env.HOME, jsonFilePath.slice(1))
  : path.resolve(jsonFilePath)

if (!fs.existsSync(resolvedPath)) {
  console.error(`エラー: ファイルが見つかりません: ${resolvedPath}`)
  process.exit(1)
}

// JSONファイルを読み込んで検証
let credentialsJson
try {
  const jsonContent = fs.readFileSync(resolvedPath, "utf-8")
  credentialsJson = JSON.parse(jsonContent)

  // 必須フィールドの確認
  if (
    !credentialsJson.project_id ||
    !credentialsJson.private_key ||
    !credentialsJson.client_email
  ) {
    console.error("エラー: JSONファイルに必須フィールドが不足しています")
    process.exit(1)
  }
} catch (error) {
  console.error("エラー: JSONファイルの読み込みに失敗しました:", error.message)
  process.exit(1)
}

// JSONを1行に圧縮
const jsonOneLine = JSON.stringify(credentialsJson)

// .env.localファイルのパス
const envFilePath = path.join(process.cwd(), ".env.local")

// 既存の.env.localを読み込む
let envContent = ""
if (fs.existsSync(envFilePath)) {
  envContent = fs.readFileSync(envFilePath, "utf-8")

  // 既存のGOOGLE_CLOUD_CREDENTIALSを削除
  const lines = envContent.split("\n")
  const filteredLines = []
  let skipNext = false

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("# Google Cloud Vision API")) {
      skipNext = true
      continue
    }
    if (lines[i].trim().startsWith("GOOGLE_CLOUD_CREDENTIALS=")) {
      skipNext = false
      continue
    }
    if (!skipNext) {
      filteredLines.push(lines[i])
    } else {
      skipNext = false
    }
  }

  envContent = filteredLines.join("\n").trim()
}

// 環境変数を追加
const newEnvLine = `GOOGLE_CLOUD_CREDENTIALS='${jsonOneLine}'`
const updatedContent = envContent
  ? `${envContent}\n\n# Google Cloud Vision API (名刺OCR用)\n${newEnvLine}`
  : `# Google Cloud Vision API (名刺OCR用)\n${newEnvLine}`

// .env.localに書き込む
fs.writeFileSync(envFilePath, updatedContent, "utf-8")

console.log("✅ 環境変数を設定しました: .env.local")
console.log(`\n📋 設定内容:`)
console.log(`   Project ID: ${credentialsJson.project_id}`)
console.log(`   Client Email: ${credentialsJson.client_email}`)
console.log(`   Private Key: 設定済み`)
console.log("\n💡 次のステップ:")
console.log("1. 開発サーバーを再起動: npm run dev")
console.log("2. プロフィール登録画面で名刺画像をアップロードしてテスト")
