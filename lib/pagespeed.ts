interface PageSpeedMetrics {
  mobileScore: number;
  desktopScore: number;
  categories: {
    performance: { mobile: number; desktop: number };
    accessibility: { mobile: number; desktop: number };
    bestPractices: { mobile: number; desktop: number };
    seo: { mobile: number; desktop: number };
  };
  coreWebVitals: {
    fcp: { mobile: number; desktop: number };
    lcp: { mobile: number; desktop: number };
    tti: { mobile: number; desktop: number };
    tbt: { mobile: number; desktop: number };
    cls: { mobile: number; desktop: number };
  };
  hasSSL: boolean;
  isMobileFriendly: boolean;
}

export async function analyzePageSpeed(url: string): Promise<PageSpeedMetrics> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_PAGESPEED_API_KEY is not set');
  }

  // モバイル分析
  const mobileResponse = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`,
    { next: { revalidate: 3600 } } // 1時間キャッシュ
  );

  if (!mobileResponse.ok) {
    throw new Error(`PageSpeed API error: ${mobileResponse.statusText}`);
  }

  const mobileData = await mobileResponse.json();

  // デスクトップ分析
  const desktopResponse = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop&key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );

  if (!desktopResponse.ok) {
    throw new Error(`PageSpeed API error: ${desktopResponse.statusText}`);
  }

  const desktopData = await desktopResponse.json();

  // スコア抽出（0-100に変換）
  const mobileScore = Math.round(
    (mobileData.lighthouseResult?.categories?.performance?.score || 0) * 100
  );
  const desktopScore = Math.round(
    (desktopData.lighthouseResult?.categories?.performance?.score || 0) * 100
  );

  // カテゴリスコア
  const categories = {
    performance: {
      mobile: Math.round((mobileData.lighthouseResult?.categories?.performance?.score || 0) * 100),
      desktop: Math.round((desktopData.lighthouseResult?.categories?.performance?.score || 0) * 100),
    },
    accessibility: {
      mobile: Math.round((mobileData.lighthouseResult?.categories?.accessibility?.score || 0) * 100),
      desktop: Math.round((desktopData.lighthouseResult?.categories?.accessibility?.score || 0) * 100),
    },
    bestPractices: {
      mobile: Math.round((mobileData.lighthouseResult?.categories?.['best-practices']?.score || 0) * 100),
      desktop: Math.round((desktopData.lighthouseResult?.categories?.['best-practices']?.score || 0) * 100),
    },
    seo: {
      mobile: Math.round((mobileData.lighthouseResult?.categories?.seo?.score || 0) * 100),
      desktop: Math.round((desktopData.lighthouseResult?.categories?.seo?.score || 0) * 100),
    },
  };

  // Core Web Vitals（ミリ秒）
  const coreWebVitals = {
    fcp: {
      mobile: mobileData.lighthouseResult?.audits?.['first-contentful-paint']?.numericValue || 0,
      desktop: desktopData.lighthouseResult?.audits?.['first-contentful-paint']?.numericValue || 0,
    },
    lcp: {
      mobile: mobileData.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue || 0,
      desktop: desktopData.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue || 0,
    },
    tti: {
      mobile: mobileData.lighthouseResult?.audits?.['interactive']?.numericValue || 0,
      desktop: desktopData.lighthouseResult?.audits?.['interactive']?.numericValue || 0,
    },
    tbt: {
      mobile: mobileData.lighthouseResult?.audits?.['total-blocking-time']?.numericValue || 0,
      desktop: desktopData.lighthouseResult?.audits?.['total-blocking-time']?.numericValue || 0,
    },
    cls: {
      mobile: mobileData.lighthouseResult?.audits?.['cumulative-layout-shift']?.numericValue || 0,
      desktop: desktopData.lighthouseResult?.audits?.['cumulative-layout-shift']?.numericValue || 0,
    },
  };

  // SSL確認
  const hasSSL = url.startsWith('https://');

  // モバイルフレンドリー確認
  const isMobileFriendly = 
    mobileData.lighthouseResult?.audits?.['viewport']?.score === 1;

  return {
    mobileScore,
    desktopScore,
    categories,
    coreWebVitals,
    hasSSL,
    isMobileFriendly,
  };
}
