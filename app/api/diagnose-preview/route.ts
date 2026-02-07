import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkAIResult } from '@/lib/fact-checker';
import { applyRateLimit } from "@/lib/rate-limit";

// 簡易キャッシュ（メモリ内、5分間有効）
const pageSpeedCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

function getCachedPageSpeed(url: string): any | null {
  const cached = pageSpeedCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ キャッシュからPageSpeedデータを取得:', url);
    return cached.data;
  }
  return null;
}

function setCachedPageSpeed(url: string, data: any): void {
  pageSpeedCache.set(url, { data, timestamp: Date.now() });
  console.log('💾 PageSpeedデータをキャッシュに保存:', url);
}

// PageSpeed API レスポンス型定義
interface LighthouseAudit {
  score: number | null;
  title?: string;
  numericValue?: number;
}

interface PageSpeedResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score: number | null };
      seo?: { score: number | null };
      accessibility?: { score: number | null };
    };
    audits?: Record<string, LighthouseAudit>;
  };
}

interface PageSpeedData {
  mobile?: PageSpeedResponse;
  desktop?: PageSpeedResponse;
}

// API エラーレスポンス型
interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

// PageSpeed Insights APIを使用してサイトを分析
async function analyzeWithPageSpeed(url: string) {
  // キャッシュチェック
  const cached = getCachedPageSpeed(url);
  if (cached) {
    return cached;
  }

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
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodedUrl}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo&key=${finalApiKey}`;
    
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
      let errorJson: ApiErrorResponse | null = null;
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
        const errorDetail = errorJson?.error?.message || '';
        console.error('🚫 PageSpeed API Rate Limit Exceeded:', {
          status: 429,
          url,
          strategy,
          errorDetail
        });
        errorMessage = `PageSpeed APIの利用制限に達しました。\n\nGoogle PageSpeed APIは1日あたり25,000リクエストの制限があります。\n\n対処法:\n1. 数分後に再度お試しください\n2. 異なる時間帯に再度アクセス\n3. 別のURLを分析する場合は少し時間をおいてください\n\n詳細: ${errorDetail}`;
      } else {
        // その他のエラー
        const errorDetail = errorJson?.error?.message || errorText.slice(0, 200);
        errorMessage = `PageSpeed API error (${response.status}): ${errorDetail || response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    results[strategy] = await response.json();
  }

  // キャッシュに保存
  setCachedPageSpeed(url, results);

  return results;
}

// PageSpeed結果から課題を抽出
function extractIssues(pageSpeedData: PageSpeedData) {
  const mobile = pageSpeedData.mobile;
  const desktop = pageSpeedData.desktop;

  const mobileScore = (mobile?.lighthouseResult?.categories?.performance?.score ?? 0) * 100;
  const desktopScore = (desktop?.lighthouseResult?.categories?.performance?.score ?? 0) * 100;
  const seoScore = (mobile?.lighthouseResult?.categories?.seo?.score ?? 0) * 100;
  const accessibilityScore = (mobile?.lighthouseResult?.categories?.accessibility?.score ?? 0) * 100;

  // SSL確認（is-on-https監査を使用）
  const hasSSL = mobile?.lighthouseResult?.audits?.['is-on-https']?.score === 1;

  // Core Web Vitals
  const fcp = mobile?.lighthouseResult?.audits?.['first-contentful-paint']?.numericValue || 0;
  const lcp = mobile?.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue || 0;
  const cls = mobile?.lighthouseResult?.audits?.['cumulative-layout-shift']?.numericValue || 0;
  const ttfb = mobile?.lighthouseResult?.audits?.['server-response-time']?.numericValue || 0;
  const tbt = mobile?.lighthouseResult?.audits?.['total-blocking-time']?.numericValue || 0;

  // モバイルフレンドリー（viewport監査を使用）
  const isMobileFriendly = mobile?.lighthouseResult?.audits?.['viewport']?.score === 1;

  // 失敗したauditsを抽出（スコア0.5未満の監査項目）
  const audits = mobile?.lighthouseResult?.audits || {};
  const failedAudits = Object.entries(audits)
    .filter(([_, audit]) => {
      const score = audit?.score;
      return typeof score === 'number' && score < 0.5 && audit?.title;
    })
    .slice(0, 10) // 最大10件
    .map(([id, audit]) => ({
      id,
      title: audit.title,
      score: Math.round((audit.score || 0) * 100),
    }));

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
    ttfb: Math.round(ttfb),
    tbt: Math.round(tbt),
    failedAudits,
  };
}

export async function POST(request: Request) {
  // レート制限チェック（10回/時間）
  const rateLimitError = applyRateLimit(request, 'diagnosis')
  if (rateLimitError) return rateLimitError

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
    } catch (error: unknown) {
      const err = error as { message?: string; stack?: string }
      console.error('❌ PageSpeed分析エラー:', {
        url,
        error: err?.message,
        stack: err?.stack,
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
以下のWebサイト診断データを基に、経営者向けに改善をお勧めする3つのポイントをお伝えください。

# 診断データ
- URL: ${url}
- モバイルスコア: ${metrics.mobileScore}/100
- デスクトップスコア: ${metrics.desktopScore}/100
- SEOスコア: ${metrics.seoScore}/100
- アクセシビリティスコア: ${metrics.accessibilityScore}/100
- SSL対応: ${metrics.hasSSL ? '対応済み' : '未対応（対応推奨）'}
- モバイルフレンドリー: ${metrics.isMobileFriendly ? 'はい' : '改善の余地あり'}
- 初回コンテンツ描画(FCP): ${metrics.fcp}ms ${metrics.fcp > 1800 ? '（目標: 1800ms以下）' : ''}
- 最大コンテンツ描画(LCP): ${metrics.lcp}ms ${metrics.lcp > 2500 ? '（目標: 2500ms以下）' : ''}
- レイアウトシフト(CLS): ${metrics.cls} ${parseFloat(metrics.cls) > 0.1 ? '（目標: 0.1以下）' : ''}

# 検出された改善項目
${metrics.failedAudits && metrics.failedAudits.length > 0
  ? metrics.failedAudits.map((a) => `- ${a.title}（スコア: ${a.score}/100）`).join('\n')
  : '- 特になし'}

# 出力形式
以下のJSON形式で、優先度の高い3つの改善ポイントを返してください：

\`\`\`json
{
  "overallScore": 数値（0-100、下記計算式で算出）,
  "topIssues": [
    {
      "category": "performance/security/mobile/seo",
      "severity": "high/medium/low",
      "issue": "改善ポイントの簡潔な説明（30字以内）",
      "impact": "改善による期待効果（50字以内）"
    }
  ]
}
\`\`\`

# 総合スコア（overallScore）の計算式
以下の加重平均で算出してください（小数点以下四捨五入）：
- パフォーマンス: (モバイルスコア + デスクトップスコア) ÷ 2 × 0.30
- SEO: SEOスコア × 0.30
- アクセシビリティ: アクセシビリティスコア × 0.20
- セキュリティ: SSL対応なら10点、未対応なら0点 × 0.10
- モバイル対応: モバイルフレンドリーなら10点、そうでなければ0点 × 0.10

計算例: モバイル80、デスクトップ90、SEO70、アクセシビリティ60、SSL対応、モバイル対応の場合
= (80+90)/2×0.30 + 70×0.30 + 60×0.20 + 10×0.10 + 10×0.10 = 25.5 + 21 + 12 + 1 + 1 = 60.5 → 61点

# 優先度の基準
- high: SSL未対応、スコア40未満、表示速度に大きな改善余地
- medium: スコア40-70、Core Web Vitals目標未達
- low: スコア70以上だがさらなる最適化が可能

重要：
- 検出された改善項目を優先的に取り上げる
- 経営者が理解しやすい前向きな表現で
- 具体的な数値を含める
- 改善による効果やメリットを伝える
- 過度に不安を煽る表現は避ける
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
      metrics: {
        mobileScore: metrics.mobileScore,
        desktopScore: metrics.desktopScore,
        seoScore: metrics.seoScore,
        accessibilityScore: metrics.accessibilityScore,
        hasSSL: metrics.hasSSL,
        isMobileFriendly: metrics.isMobileFriendly,
        fcp: metrics.fcp,
        lcp: metrics.lcp,
        cls: metrics.cls,
        ttfb: metrics.ttfb,
        tbt: metrics.tbt,
      },
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

  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string; name?: string; cause?: unknown }
    console.error('❌ Diagnosis preview error:', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      cause: err?.cause,
    });

    // PageSpeed APIキーが設定されていない場合の特別な処理
    if (err?.message?.includes('PageSpeed APIキー') || err?.message?.includes('PageSpeed API key') || err?.message?.includes('GOOGLE_PAGESPEED_API_KEY')) {
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
    if (err?.message?.includes('ANTHROPIC_API_KEY') || err?.message?.includes('Anthropic')) {
      return NextResponse.json(
        {
          error: 'ANTHROPIC_API_KEYが設定されていません',
          details: 'Claude APIを使用するには、環境変数 ANTHROPIC_API_KEY を設定する必要があります。',
          code: 'ANTHROPIC_API_KEY_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    // PageSpeed API レート制限エラーの特別な処理
    if (err?.message?.includes('利用制限に達しました') || err?.message?.includes('429 Too Many Requests')) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'PageSpeed APIの利用制限に達しました',
          details: 'Google PageSpeed APIは1日あたり25,000リクエストの制限があります。数分後に再度お試しください。',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 300, // 5分後に再試行を推奨
          suggestion: '別のURLを分析する場合は、少し時間をおいてからアクセスしてください。'
        },
        { status: 429 }
      );
    }

    // その他のエラー（詳細を返すが、本番環境では機密情報を隠す）
    const isProduction = process.env.NODE_ENV === 'production';
    const errorDetails = isProduction
      ? 'サーバー内部エラーが発生しました。詳細はサーバーログを確認してください。'
      : err?.message || '分析に失敗しました';

    return NextResponse.json(
      {
        error: errorDetails,
        details: err?.message?.includes('PageSpeed API error')
          ? 'PageSpeed APIの呼び出しに失敗しました。APIキーやURLを確認してください。'
          : err?.message?.includes('Failed to parse AI response')
          ? 'AIレスポンスの解析に失敗しました。'
          : undefined,
        code: isProduction ? 'INTERNAL_SERVER_ERROR' : undefined,
        // 開発環境でのみスタックトレースを返す
        ...(isProduction ? {} : { stack: err?.stack }),
      },
      { status: 500 }
    );
  }
}


