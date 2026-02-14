/**
 * AIコンサルティングレポート スライド生成スクリプト
 *
 * 使い方:
 * 1. GOOGLE_AI_API_KEY を .env に設定
 * 2. npx tsx slides/scripts/generate-slides.ts
 */

import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"

// Gemini API設定
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || ""
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

interface ConsultingData {
  companyName: string
  industry: string
  challenges: string[]
  recommendations: string[]
  metrics: {
    name: string
    value: string
    trend: "up" | "down" | "stable"
  }[]
}

// Gemini APIでテキストを生成
async function generateWithGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GOOGLE_AI_API_KEY が設定されていません。サンプルテキストを使用します。")
    return "AI分析結果のサンプルテキスト"
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

// Marp形式のスライドを生成
async function generateMarpSlides(data: ConsultingData): Promise<string> {
  // AIで分析サマリーを生成
  const analysisPrompt = `
    以下の企業データを分析し、経営コンサルタントとして簡潔なサマリーを作成してください：
    - 企業名: ${data.companyName}
    - 業界: ${data.industry}
    - 課題: ${data.challenges.join(", ")}
    - 指標: ${data.metrics.map((m) => `${m.name}: ${m.value}`).join(", ")}
    
    3行程度で要約してください。
  `

  const aiSummary = await generateWithGemini(analysisPrompt)

  // Marpスライドを生成
  const slides = `---
marp: true
theme: default
paginate: true
header: "AI Consulting Report"
footer: "SolveWise - AI Powered Consulting"
style: |
  section {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #ffffff;
  }
  h1 { color: #4fc3f7; }
  h2 { color: #81d4fa; }
  table { font-size: 0.9em; }
  th { background: rgba(79, 195, 247, 0.3); }
---

# 経営分析レポート
## ${data.companyName} 様

**業界**: ${data.industry}
**作成日**: ${new Date().toLocaleDateString("ja-JP")}
**作成者**: SolveWise AI Consulting

---

# 📊 AIによる分析サマリー

${aiSummary}

---

# 📈 主要指標

| 指標 | 値 | トレンド |
|------|-----|---------|
${data.metrics.map((m) => `| ${m.name} | ${m.value} | ${m.trend === "up" ? "📈" : m.trend === "down" ? "📉" : "➡️"} |`).join("\n")}

---

# 🎯 課題分析

${data.challenges.map((c, i) => `## ${i + 1}. ${c}`).join("\n\n")}

---

# 💡 提案事項

${data.recommendations.map((r, i) => `${i + 1}. **${r}**`).join("\n")}

---

# 🚀 次のステップ

1. 詳細ヒアリングの実施
2. 具体的なアクションプランの策定
3. 実行支援とモニタリング

---

# Thank You

**SolveWise**
*AI Powered Consulting*

お問い合わせ: contact@solvewise.ai
`

  return slides
}

// メイン処理
async function main() {
  console.log("🚀 スライド生成を開始...")

  // サンプルデータ
  const sampleData: ConsultingData = {
    companyName: "株式会社サンプル",
    industry: "製造業",
    challenges: ["人材不足による生産性低下", "デジタル化の遅れ", "原材料コストの上昇"],
    recommendations: [
      "AI・RPA導入による業務自動化",
      "DX推進プロジェクトの立ち上げ",
      "サプライチェーンの最適化",
    ],
    metrics: [
      { name: "売上高", value: "50億円", trend: "up" },
      { name: "営業利益率", value: "8.5%", trend: "stable" },
      { name: "従業員数", value: "250名", trend: "down" },
      { name: "顧客満足度", value: "4.2/5.0", trend: "up" },
    ],
  }

  try {
    const slides = await generateMarpSlides(sampleData)

    // 出力ディレクトリ
    const outputDir = join(__dirname, "..", "output")
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    // Markdownファイルを保存
    const outputPath = join(outputDir, "consulting-report.md")
    writeFileSync(outputPath, slides)
    console.log(`✅ スライドを生成しました: ${outputPath}`)

    // Marpでプレビュー/変換コマンドを表示
    console.log("\n📋 次のステップ:")
    console.log(`  プレビュー: marp --preview ${outputPath}`)
    console.log(`  PDF出力:   marp --pdf ${outputPath}`)
    console.log(`  HTML出力:  marp ${outputPath} -o consulting-report.html`)
  } catch (error) {
    console.error("❌ エラー:", error)
    process.exit(1)
  }
}

main()
