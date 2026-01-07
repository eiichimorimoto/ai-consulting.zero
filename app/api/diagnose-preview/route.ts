import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkAIResult } from '@/lib/fact-checker';

// PageSpeed Insights APIを使用してサイトを分析
async function analyzeWithPageSpeed(url: string) {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  
  // APIキーの詳細な確認
  const hasKey = !!apiKey;
  const keyLength = apiKey?.length || 0;
  const keyPrefix = apiKey ? `${apiKey.substring(0, 10)}...` : 'なし';
  const keyEndsWith = apiKey ? `...${apiKey.substring(apiKey.length - 5)}` : 'なし';
  
  console.log('🔑 PageSpeed APIキー確認:', {
    hasKey,
    keyLength,
    keyPrefix,
    keyEndsWith,
    nodeEnv: process.env.NODE_ENV,
  });
  
  if (!apiKey || apiKey.trim().length === 0) {
    const errorMessage = 'PageSpeed APIキーが設定されていません。Vercelの環境変数に GOOGLE_PAGESPEED_API_KEY を設定してください。';
    console.error('❌ PageSpeed APIキーが設定されていません:', {
      hasKey,
      keyLength,
      nodeEnv: process.env.NODE_ENV,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('PAGESPEED') || k.includes('GOOGLE')),
    });
    throw new Error(errorMessage);
  }
  
  // APIキーに空白や改行が含まれていないか確認
  const trimmedKey = apiKey.trim();
  if (trimmedKey !== apiKey) {
    console.warn('⚠️ PageSpeed APIキーに前後の空白が含まれています。自動的にトリムします。');
  }
  
  if (trimmedKey.length === 0) {
    console.error('❌ PageSpeed APIキーが空です');
    throw new Error('PageSpeed APIキーが空です。Vercelの環境変数 GOOGLE_PAGESPEED_API_KEY を確認してください。');
  }

  const strategies = ['mobile', 'desktop'] as const;
  const results: Record<string, any> = {};

  // トリムされたAPIキーを使用
  const finalApiKey = apiKey.trim();
  
  for (const strategy of strategies) {
    // URLをエンコード（末尾スラッシュの有無に関係なく処理）
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodedUrl}&strategy=${strategy}&key=${finalApiKey}`;
    
    console.log(`📡 PageSpeed API呼び出し (${strategy}):`, { 
      url, 
      encodedUrl, 
      apiUrl: apiUrl.replace(finalApiKey, '***'),
      keyLength: finalApiKey.length,
    });
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        console.error('❌ エラーレスポンスの読み取りに失敗:', e);
      }
      
      let errorMessage = `PageSpeed API error: ${response.status} ${response.statusText}`;
      
      // エラーの詳細をログに出力
      console.error(`❌ PageSpeed API Error (${strategy}):`, {
        status: response.status,
        statusText: response.statusText,
        url: url,
        encodedUrl: encodedUrl,
        errorText: errorText.slice(0, 1000),
        hasApiKey: !!finalApiKey,
        apiKeyLength: finalApiKey.length,
      });
      
      // エラーレスポンスをパースして詳細を取得
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // JSONパースに失敗した場合は無視
      }
      
      // 403エラーの場合（APIキーの問題）
      if (response.status === 403) {
        const errorDetail = errorJson?.error?.message || errorText.slice(0, 200);
        errorMessage = `PageSpeed APIキーが無効です（403 Forbidden）。APIキーが正しいか、PageSpeed Insights APIが有効になっているか確認してください。エラー詳細: ${errorDetail}`;
      } else if (response.status === 400) {
        const errorDetail = errorJson?.error?.message || errorText.slice(0, 200);
        errorMessage = `PageSpeed APIリクエストが無効です（400 Bad Request）。URLが正しいか確認してください。エラー詳細: ${errorDetail}`;
      } else if (response.status === 429) {
        errorMessage = `PageSpeed APIの利用制限に達しました（429 Too Many Requests）。しばらく時間をおいてから再度お試しください。`;
      } else {
        // その他のエラー
        const errorDetail = errorJson?.error?.message || errorText.slice(0, 200);
        errorMessage = `PageSpeed API error (${response.status}): ${errorDetail || response.statusText}`;
      }
      
      throw new Error(errorMessage);
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
    let { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // URLを正規化（前後の空白を削除）
    url = url.trim();

    // URL検証と正規化
    let normalizedUrl: string;
    try {
      // http:// または https:// が付いていない場合は https:// を追加
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        normalizedUrl = `https://${url}`;
      } else {
        normalizedUrl = url;
      }
      
      // URLオブジェクトで検証と正規化
      // URLオブジェクトは自動的に正規化される（末尾スラッシュの有無に関係なく処理可能）
      const urlObj = new URL(normalizedUrl);
      // toString()で正規化されたURLを取得（末尾スラッシュの有無は元のURLに依存）
      normalizedUrl = urlObj.toString();
      
      // ログ出力（デバッグ用）
      console.log('📋 URL正規化:', { original: url, normalized: normalizedUrl });
    } catch (error) {
      console.error('❌ Invalid URL format:', { originalUrl: url, error });
      return NextResponse.json(
        { error: `無効なURL形式です: ${url}` },
        { status: 400 }
      );
    }

    // 正規化されたURLを使用
    url = normalizedUrl;

    // PageSpeed分析を実行
    console.log('🔍 PageSpeed分析開始:', { url, normalizedUrl: url });
    let pageSpeedData;
    try {
      pageSpeedData = await analyzeWithPageSpeed(url);
    } catch (error: any) {
      console.error('❌ PageSpeed分析エラー:', {
        url,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
    const metrics = extractIssues(pageSpeedData);

    // Claude APIで課題を分析・表現
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!anthropicApiKey) {
      console.error('❌ ANTHROPIC_API_KEYが設定されていません');
      return NextResponse.json(
        {
          error: 'ANTHROPIC_API_KEYが設定されていません',
          details: 'Claude APIを使用するには、環境変数 ANTHROPIC_API_KEY を設定する必要があります。',
          code: 'ANTHROPIC_API_KEY_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }
    
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
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

    // ファクトチェックを実行
    const factCheckResult = checkAIResult({
      scores: {
        overall: result.overallScore,
        mobile: metrics.mobileScore,
        desktop: metrics.desktopScore,
        seo: metrics.seoScore,
        accessibility: metrics.accessibilityScore,
      },
      issues: result.topIssues,
      metrics: metrics,
    });

    console.log("📋 AI診断ファクトチェック結果:", JSON.stringify(factCheckResult, null, 2));

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        reportId,
        metrics,
        url,
      },
      factCheck: factCheckResult,
    });

  } catch (error: any) {
    console.error('❌ Diagnosis preview error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });
    
    // PageSpeed APIキーが設定されていない場合の特別な処理
    if (error.message?.includes('PageSpeed APIキー') || error.message?.includes('PageSpeed API key') || error.message?.includes('GOOGLE_PAGESPEED_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'PageSpeed APIキーが設定されていません',
          details: 'Vercelの環境変数に GOOGLE_PAGESPEED_API_KEY を設定してください。設定後、デプロイを再実行してください。',
          code: 'PAGESPEED_API_KEY_NOT_CONFIGURED',
          helpUrl: 'https://vercel.com/docs/concepts/projects/environment-variables'
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    // ANTHROPIC APIキーが設定されていない場合の特別な処理
    if (error.message?.includes('ANTHROPIC_API_KEY') || error.message?.includes('Anthropic')) {
      return NextResponse.json(
        {
          error: 'ANTHROPIC_API_KEYが設定されていません',
          details: 'Claude APIを使用するには、環境変数 ANTHROPIC_API_KEY を設定する必要があります。',
          code: 'ANTHROPIC_API_KEY_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }
    
    // その他のエラー（詳細を返すが、本番環境では機密情報を隠す）
    const isProduction = process.env.NODE_ENV === 'production';
    const errorDetails = isProduction 
      ? 'サーバー内部エラーが発生しました。詳細はサーバーログを確認してください。'
      : error.message || '分析に失敗しました';
    
    return NextResponse.json(
      { 
        error: errorDetails,
        details: error.message?.includes('PageSpeed API error') 
          ? 'PageSpeed APIの呼び出しに失敗しました。APIキーやURLを確認してください。'
          : error.message?.includes('Failed to parse AI response')
          ? 'AIレスポンスの解析に失敗しました。'
          : undefined,
        code: isProduction ? 'INTERNAL_SERVER_ERROR' : undefined,
        // 開発環境でのみスタックトレースを返す
        ...(isProduction ? {} : { stack: error.stack }),
      },
      { status: 500 }
    );
  }
}


