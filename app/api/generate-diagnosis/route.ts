import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prepareDiagnosisData } from '@/lib/prepare-diagnosis-data';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // 診断データを準備
    const diagnosisData = await prepareDiagnosisData(companyId);

    // Claude APIで診断レポートを生成
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `
あなたは日本の中小企業向けの経営コンサルタントです。
以下のデータを基に、企業の課題を分析し、具体的な改善提案を含む診断レポートを作成してください。

# 企業情報
- 企業名: ${diagnosisData.company.name}
- 業種: ${diagnosisData.company.industry}
- 従業員数: ${diagnosisData.company.employeeCount}人
- 設立年: ${diagnosisData.company.founded}年
- Webサイト: ${diagnosisData.company.website}

# デジタル診断結果
${diagnosisData.digital ? `
## Webサイトパフォーマンス
- モバイルスコア: ${diagnosisData.digital.webPerformance.mobileScore}/100
- デスクトップスコア: ${diagnosisData.digital.webPerformance.desktopScore}/100
- 評価: ${diagnosisData.digital.webPerformance.status}

## セキュリティ
- SSL対応: ${diagnosisData.digital.security.hasSSL ? '対応済み' : '未対応'}
- 状態: ${diagnosisData.digital.security.status}

## モバイル対応
- モバイルフレンドリー: ${diagnosisData.digital.mobile.isFriendly ? '対応済み' : '未対応'}
- 状態: ${diagnosisData.digital.mobile.status}

## Core Web Vitals
- LCP (最大コンテンツの描画): ${diagnosisData.digital.coreWebVitals.lcp.mobile}ms (${diagnosisData.digital.coreWebVitals.lcp.status})
- FCP (最初のコンテンツの描画): ${diagnosisData.digital.coreWebVitals.fcp.mobile}ms (${diagnosisData.digital.coreWebVitals.fcp.status})
- CLS (累積レイアウトシフト): ${diagnosisData.digital.coreWebVitals.cls.mobile} (${diagnosisData.digital.coreWebVitals.cls.status})
` : 'デジタルスコアデータなし'}

# 検出された課題
${Object.entries(diagnosisData.issueFlags)
  .filter(([_, value]) => value)
  .map(([key, _]) => `- ${key}`)
  .join('\n')}

# レポート作成要件
以下のJSON形式で診断レポートを作成してください：

\`\`\`json
{
  "title": "診断レポートのタイトル",
  "summary": "200字程度の要約",
  "matched_issues": [
    {
      "category": "カテゴリ（performance/security/mobile/ux）",
      "severity": "深刻度（critical/high/medium/low）",
      "issue": "問題の説明",
      "impact": "ビジネスへの影響",
      "recommendation": "具体的な改善提案"
    }
  ],
  "scores": {
    "priority": 85,
    "urgency": 70,
    "impact": 90,
    "overall": 82
  },
  "report_markdown": "Markdown形式の完全なレポート本文"
}
\`\`\`

重要：
- 経営者が理解しやすい言葉で説明
- 具体的な数値と事例を含める
- 改善による効果を明確に示す
- 優先順位をつける
- Cold Readingの要領で「御社の課題は○○ですね」という共感から入る
`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // レスポンスからJSONを抽出
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const report = JSON.parse(jsonMatch[1]);

    // Supabaseに保存
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('diagnostic_reports')
      .insert({
        company_id: companyId,
        report_title: report.title,
        report_summary: report.summary,
        report_markdown: report.report_markdown,
        report_json: report,
        matched_issues: report.matched_issues,
        priority_score: report.scores.priority,
        urgency_score: report.scores.urgency,
        impact_score: report.scores.impact,
        overall_score: report.scores.overall,
        generated_by: 'ai',
        generation_model: 'claude-sonnet-4-20250514',
        status: 'final',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      report: data,
    });

  } catch (error: unknown) {
    console.error('Diagnosis generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
