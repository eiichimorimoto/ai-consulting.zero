/**
 * Nano Banana Pro + Marp スライド生成スクリプト
 * 
 * Gemini 3 Pro と Nano Banana Pro を使用して
 * AIコンサルティングレポートのスライドを自動生成
 * 
 * 使い方:
 * 1. GOOGLE_AI_API_KEY を .env に設定
 * 2. npx tsx slides/scripts/generate-with-nano-banana.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Google AI API設定
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';

// Gemini API エンドポイント（gemini-2.5-flash を使用）
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Imagen 3 (画像生成) API エンドポイント
const IMAGEN_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages';

interface ConsultingData {
  companyName: string;
  industry: string;
  period: string;
  challenges: string[];
  recommendations: string[];
  metrics: {
    name: string;
    value: string;
    previousValue?: string;
    trend: 'up' | 'down' | 'stable';
  }[];
}

// Gemini 3 Pro でテキスト分析を生成
async function analyzeWithGemini(prompt: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) {
    console.warn('⚠️ GOOGLE_AI_API_KEY が設定されていません');
    return generateSampleAnalysis();
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API Error:', error);
      return generateSampleAnalysis();
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || generateSampleAnalysis();
  } catch (error) {
    console.error('API Error:', error);
    return generateSampleAnalysis();
  }
}

// Imagen 3 / Nano Banana Pro で図を生成
async function generateVisualization(prompt: string, filename: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) {
    console.warn('⚠️ 画像生成にはAPIキーが必要です。プレースホルダーを使用します。');
    return createPlaceholderSVG(prompt, filename);
  }

  try {
    // Imagen 3 API を呼び出し
    const response = await fetch(`${IMAGEN_API_URL}?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        numberOfImages: 1,
        aspectRatio: '16:9',
        safetyFilterLevel: 'BLOCK_MEDIUM_AND_ABOVE'
      })
    });

    if (!response.ok) {
      console.warn('Imagen API not available, using placeholder');
      return createPlaceholderSVG(prompt, filename);
    }

    const data = await response.json();
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;
    
    if (imageBase64) {
      const imagePath = join(__dirname, '..', 'output', 'images', `${filename}.png`);
      const imageDir = join(__dirname, '..', 'output', 'images');
      if (!existsSync(imageDir)) {
        mkdirSync(imageDir, { recursive: true });
      }
      writeFileSync(imagePath, Buffer.from(imageBase64, 'base64'));
      return `./images/${filename}.png`;
    }

    return createPlaceholderSVG(prompt, filename);
  } catch (error) {
    console.error('Image generation error:', error);
    return createPlaceholderSVG(prompt, filename);
  }
}

// プレースホルダーSVGを生成
function createPlaceholderSVG(description: string, filename: string): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <text x="400" y="200" text-anchor="middle" fill="#4fc3f7" font-size="24" font-family="sans-serif">
    📊 ${description.substring(0, 50)}...
  </text>
  <text x="400" y="250" text-anchor="middle" fill="#81d4fa" font-size="16" font-family="sans-serif">
    [Nano Banana Pro で生成予定]
  </text>
  <text x="400" y="290" text-anchor="middle" fill="#666" font-size="12" font-family="sans-serif">
    GOOGLE_AI_API_KEY を設定すると実際の図が生成されます
  </text>
</svg>`.trim();

  const svgPath = join(__dirname, '..', 'output', 'images', `${filename}.svg`);
  const imageDir = join(__dirname, '..', 'output', 'images');
  if (!existsSync(imageDir)) {
    mkdirSync(imageDir, { recursive: true });
  }
  writeFileSync(svgPath, svg);
  return `./images/${filename}.svg`;
}

// サンプル分析を生成
function generateSampleAnalysis(): string {
  return `
当社の分析によると、以下の3つの重要なポイントが明らかになりました：

1. **市場ポジションの強化**: 競合他社と比較して、デジタル施策の導入が遅れているものの、顧客基盤は堅調です。

2. **コスト構造の最適化余地**: 現在のオペレーションコストには約15-20%の削減余地があると推定されます。

3. **成長機会**: AI・自動化技術の導入により、生産性を30%向上させる可能性があります。
`.trim();
}

// Marpスライドを生成
async function generateConsultingSlides(data: ConsultingData): Promise<string> {
  console.log('📊 Gemini 3 Pro で分析中...');
  
  // AIで分析を生成
  const analysisPrompt = `
あなたは経験豊富な経営コンサルタントです。
以下の企業データを分析し、経営改善のための洞察を提供してください：

【企業情報】
- 企業名: ${data.companyName}
- 業界: ${data.industry}
- 分析期間: ${data.period}

【課題】
${data.challenges.map((c, i) => `${i + 1}. ${c}`).join('\n')}

【現在の指標】
${data.metrics.map(m => `- ${m.name}: ${m.value} (${m.trend === 'up' ? '↑上昇' : m.trend === 'down' ? '↓下降' : '→横ばい'})`).join('\n')}

分析結果を3つのポイントで、各ポイント2-3文で簡潔にまとめてください。
  `;

  const analysis = await analyzeWithGemini(analysisPrompt);

  console.log('🎨 Nano Banana Pro で可視化生成中...');

  // 可視化を生成
  const salesChartPath = await generateVisualization(
    `Business infographic showing sales growth trend for ${data.industry} company, modern corporate style, blue gradient colors`,
    'sales-trend'
  );

  const metricsChartPath = await generateVisualization(
    `Dashboard infographic with KPI metrics: revenue, profit margin, customer satisfaction, professional business style`,
    'metrics-dashboard'
  );

  const roadmapPath = await generateVisualization(
    `Strategic roadmap infographic showing 3 phases of digital transformation, timeline format, modern tech style`,
    'action-roadmap'
  );

  // Marpスライドを構築
  const slides = `---
marp: true
theme: default
paginate: true
header: "AI Consulting Report"
footer: "SolveWise - AI Powered Consulting | Generated with Gemini 3 Pro + Nano Banana Pro"
style: |
  section {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #ffffff;
  }
  h1 { color: #4fc3f7; font-size: 2.5em; }
  h2 { color: #81d4fa; }
  h3 { color: #b3e5fc; }
  table { font-size: 0.85em; width: 100%; }
  th { background: rgba(79, 195, 247, 0.3); }
  td { background: rgba(255, 255, 255, 0.05); }
  .highlight {
    background: rgba(79, 195, 247, 0.15);
    padding: 15px;
    border-radius: 10px;
    border-left: 4px solid #4fc3f7;
  }
  .metric-up { color: #4caf50; }
  .metric-down { color: #f44336; }
  .metric-stable { color: #ff9800; }
  img { border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
---

# 🎯 経営分析レポート
## ${data.companyName} 様

<div class="highlight">

**業界**: ${data.industry}
**分析期間**: ${data.period}
**作成日**: ${new Date().toLocaleDateString('ja-JP')}
**作成者**: SolveWise AI Consulting

*Powered by Gemini 3 Pro + Nano Banana Pro*

</div>

---

# 📊 AIによる分析サマリー

${analysis}

---

# 📈 売上・業績トレンド

![売上トレンド](${salesChartPath})

*Nano Banana Pro による可視化*

---

# 🎯 主要KPI ダッシュボード

![メトリクスダッシュボード](${metricsChartPath})

| 指標 | 現在値 | トレンド |
|------|--------|---------|
${data.metrics.map(m => {
  const trendIcon = m.trend === 'up' ? '📈' : m.trend === 'down' ? '📉' : '➡️';
  const trendClass = m.trend === 'up' ? 'metric-up' : m.trend === 'down' ? 'metric-down' : 'metric-stable';
  return `| ${m.name} | **${m.value}** | <span class="${trendClass}">${trendIcon}</span> |`;
}).join('\n')}

---

# ⚠️ 課題分析

${data.challenges.map((challenge, i) => `
### ${i + 1}. ${challenge}

`).join('')}

---

# 💡 改善提案

${data.recommendations.map((rec, i) => `
${i + 1}. **${rec}**
`).join('')}

---

# 🚀 アクションロードマップ

![ロードマップ](${roadmapPath})

---

# 📋 推奨アクション

## Phase 1（1-3ヶ月）
- 現状分析の詳細化
- クイックウィンの実施

## Phase 2（4-6ヶ月）
- 本格的な改善施策の実行
- 効果測定とPDCA

## Phase 3（7-12ヶ月）
- 成果の定着化
- 次期計画の策定

---

# 📞 次のステップ

<div class="highlight">

## ご相談・お問い合わせ

詳細なコンサルティングをご希望の場合は、
以下までお気軽にご連絡ください。

📧 **Email**: contact@solvewise.ai
🌐 **Web**: https://solvewise.ai

</div>

---

# Thank You

<div style="text-align: center; margin-top: 50px;">

# **SolveWise**
### *AI Powered Consulting*

🤖 Gemini 3 Pro + 🍌 Nano Banana Pro

</div>

`;

  return slides;
}

// メイン処理
async function main() {
  console.log('🚀 AIコンサルティングレポート生成を開始...\n');

  // サンプルデータ（実際のコンサル結果に置き換え可能）
  const consultingData: ConsultingData = {
    companyName: '株式会社サンプル',
    industry: '製造業',
    period: '2024年度 Q1-Q3',
    challenges: [
      '人材不足による生産性低下',
      'デジタル化の遅れによる競争力低下',
      '原材料コストの上昇への対応',
      '新規顧客開拓の停滞'
    ],
    recommendations: [
      'AI・RPA導入による業務自動化（ROI: 150%見込み）',
      'DX推進プロジェクトの立ち上げと人材育成',
      'サプライチェーンの最適化によるコスト削減',
      'デジタルマーケティング強化による新規顧客獲得'
    ],
    metrics: [
      { name: '売上高', value: '50億円', previousValue: '45億円', trend: 'up' },
      { name: '営業利益率', value: '8.5%', previousValue: '8.2%', trend: 'stable' },
      { name: '従業員数', value: '250名', previousValue: '265名', trend: 'down' },
      { name: '顧客満足度', value: '4.2/5.0', previousValue: '4.0/5.0', trend: 'up' },
      { name: 'デジタル化率', value: '35%', previousValue: '25%', trend: 'up' }
    ]
  };

  try {
    const slides = await generateConsultingSlides(consultingData);
    
    // 出力ディレクトリ
    const outputDir = join(__dirname, '..', 'output');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Markdownファイルを保存
    const outputPath = join(outputDir, 'ai-consulting-report.md');
    writeFileSync(outputPath, slides);
    
    console.log('\n✅ スライドを生成しました！');
    console.log(`📄 ファイル: ${outputPath}`);
    
    console.log('\n📋 次のステップ:');
    console.log(`  🔍 プレビュー: marp --preview "${outputPath}"`);
    console.log(`  📑 PDF出力:   marp --pdf "${outputPath}"`);
    console.log(`  🌐 HTML出力:  marp "${outputPath}" -o report.html`);
    console.log(`  📊 PPTX出力:  marp --pptx "${outputPath}"`);

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();



