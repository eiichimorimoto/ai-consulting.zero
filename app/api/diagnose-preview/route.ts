import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// PageSpeed Insights APIを使用してサイトを分析
async function analyzeWithPageSpeed(url: string) {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  
  if (!apiKey) {
    throw new Error('PageSpeed API key not configured');
  }

  const strategies = ['mobile', 'desktop'] as const;
  const results: Record<string, any> = {};

  for (const strategy of strategies) {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${apiKey}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`PageSpeed API error: ${response.statusText}`);
    }
    
    results[strategy] = await response.json();
  }

  return results;
}

// PageSpeed結果から課題を抽出
function extractIssues(pageSpeedData: any) {
  const mobile = pageSpeedData.mobile;
  const desktop = pageSpeedData.desktop;
  
  const mobileScore = mobile?.lighthouseResult?.categories?.performance?.score * 100 || 0;
  const desktopScore = desktop?.lighthouseResult?.categories?.performance?.score * 100 || 0;
  const seoScore = mobile?.lighthouseResult?.categories?.seo?.score * 100 || 0;
  const accessibilityScore = mobile?.lighthouseResult?.categories?.accessibility?.score * 100 || 0;
  
  // SSL確認
  const hasSSL = mobile?.lighthouseResult?.finalUrl?.startsWith('https://') ?? false;
  
  // Core Web Vitals
  const fcp = mobile?.lighthouseResult?.audits?.['first-contentful-paint']?.numericValue || 0;
  const lcp = mobile?.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue || 0;
  const cls = mobile?.lighthouseResult?.audits?.['cumulative-layout-shift']?.numericValue || 0;
  
  // モバイルフレンドリー
  const isMobileFriendly = mobileScore >= 50;

  return {
    mobileScore: Math.round(mobileScore),
    desktopScore: Math.round(desktopScore),
    seoScore: Math.round(seoScore),
    accessibilityScore: Math.round(accessibilityScore),
    hasSSL,
    isMobileFriendly,
    fcp: Math.round(fcp),
    lcp: Math.round(lcp),
    cls: cls.toFixed(3),
  };
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // URL検証
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // PageSpeed分析を実行
    const pageSpeedData = await analyzeWithPageSpeed(url);
    const metrics = extractIssues(pageSpeedData);

    // Claude APIで課題を分析・表現
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `
あなたは日本の中小企業向けWebコンサルタントです。
以下のWebサイト診断データを基に、経営者向けに最も重要な3つの課題を指摘してください。

# 診断データ
- URL: ${url}
- モバイルスコア: ${metrics.mobileScore}/100
- デスクトップスコア: ${metrics.desktopScore}/100
- SEOスコア: ${metrics.seoScore}/100
- SSL対応: ${metrics.hasSSL ? '対応済み' : '未対応'}
- モバイルフレンドリー: ${metrics.isMobileFriendly ? 'はい' : 'いいえ'}
- 初回コンテンツ描画(FCP): ${metrics.fcp}ms
- 最大コンテンツ描画(LCP): ${metrics.lcp}ms
- レイアウトシフト(CLS): ${metrics.cls}

# 出力形式
以下のJSON形式で、最も重要な3つの課題を返してください：

\`\`\`json
{
  "overallScore": 数値（0-100）,
  "topIssues": [
    {
      "category": "performance/security/mobile/seo",
      "severity": "critical/high/medium",
      "issue": "問題の簡潔な説明（20字以内）",
      "impact": "経営者が理解できるビジネスへの影響（50字以内）"
    }
  ]
}
\`\`\`

重要：
- 経営者が即座に理解できる表現で
- 具体的な数値や割合を含める
- ビジネスへの損失を明確に
`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const result = JSON.parse(jsonMatch[1]);

    // レポートIDを生成（一時的なもの、登録後に正式なものに置き換え）
    const reportId = `preview-${Date.now()}`;

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        reportId,
        metrics,
        url,
      },
    });

  } catch (error: any) {
    console.error('Diagnosis preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}

