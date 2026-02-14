interface PageSpeedMetrics {
  mobileScore: number
  desktopScore: number
  categories: {
    performance: { mobile: number; desktop: number }
    accessibility: { mobile: number; desktop: number }
    bestPractices: { mobile: number; desktop: number }
    seo: { mobile: number; desktop: number }
  }
  coreWebVitals: {
    fcp: { mobile: number; desktop: number }
    lcp: { mobile: number; desktop: number }
    tti: { mobile: number; desktop: number }
    tbt: { mobile: number; desktop: number }
    cls: { mobile: number; desktop: number }
  }
  hasSSL: boolean
  isMobileFriendly: boolean
}

export async function analyzePageSpeed(url: string): Promise<PageSpeedMetrics> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY

  if (!apiKey) {
    throw new Error(
      "PageSpeed APIキーが設定されていません。環境変数 GOOGLE_PAGESPEED_API_KEY を設定してください。"
    )
  }

  // モバイル分析
  const mobileResponse = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`,
    { next: { revalidate: 3600 } } // 1時間キャッシュ
  )

  if (!mobileResponse.ok) {
    const errorText = await mobileResponse.text().catch(() => "")
    console.error(`❌ PageSpeed API Error (mobile):`, {
      status: mobileResponse.status,
      statusText: mobileResponse.statusText,
      url: url,
      errorText: errorText.slice(0, 500),
    })

    let errorMessage = `PageSpeed API error: ${mobileResponse.status} ${mobileResponse.statusText}`
    if (mobileResponse.status === 403) {
      errorMessage = `PageSpeed APIキーが無効です（403 Forbidden）。APIキーが正しいか、PageSpeed Insights APIが有効になっているか確認してください。`
    } else if (mobileResponse.status === 400) {
      errorMessage = `PageSpeed APIリクエストが無効です（400 Bad Request）。URLが正しいか確認してください。`
    } else if (mobileResponse.status === 429) {
      errorMessage = `PageSpeed APIの利用制限に達しました（429 Too Many Requests）。しばらく時間をおいてから再度お試しください。`
    }

    throw new Error(errorMessage)
  }

  const mobileData = await mobileResponse.json()

  // デスクトップ分析
  const desktopResponse = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop&key=${apiKey}`,
    { next: { revalidate: 3600 } }
  )

  if (!desktopResponse.ok) {
    const errorText = await desktopResponse.text().catch(() => "")
    console.error(`❌ PageSpeed API Error (desktop):`, {
      status: desktopResponse.status,
      statusText: desktopResponse.statusText,
      url: url,
      errorText: errorText.slice(0, 500),
    })

    let errorMessage = `PageSpeed API error: ${desktopResponse.status} ${desktopResponse.statusText}`
    if (desktopResponse.status === 403) {
      errorMessage = `PageSpeed APIキーが無効です（403 Forbidden）。APIキーが正しいか、PageSpeed Insights APIが有効になっているか確認してください。`
    } else if (desktopResponse.status === 400) {
      errorMessage = `PageSpeed APIリクエストが無効です（400 Bad Request）。URLが正しいか確認してください。`
    } else if (desktopResponse.status === 429) {
      errorMessage = `PageSpeed APIの利用制限に達しました（429 Too Many Requests）。しばらく時間をおいてから再度お試しください。`
    }

    throw new Error(errorMessage)
  }

  const desktopData = await desktopResponse.json()

  // スコア抽出（0-100に変換）
  const mobileScore = Math.round(
    (mobileData.lighthouseResult?.categories?.performance?.score || 0) * 100
  )
  const desktopScore = Math.round(
    (desktopData.lighthouseResult?.categories?.performance?.score || 0) * 100
  )

  // カテゴリスコア
  const categories = {
    performance: {
      mobile: Math.round((mobileData.lighthouseResult?.categories?.performance?.score || 0) * 100),
      desktop: Math.round(
        (desktopData.lighthouseResult?.categories?.performance?.score || 0) * 100
      ),
    },
    accessibility: {
      mobile: Math.round(
        (mobileData.lighthouseResult?.categories?.accessibility?.score || 0) * 100
      ),
      desktop: Math.round(
        (desktopData.lighthouseResult?.categories?.accessibility?.score || 0) * 100
      ),
    },
    bestPractices: {
      mobile: Math.round(
        (mobileData.lighthouseResult?.categories?.["best-practices"]?.score || 0) * 100
      ),
      desktop: Math.round(
        (desktopData.lighthouseResult?.categories?.["best-practices"]?.score || 0) * 100
      ),
    },
    seo: {
      mobile: Math.round((mobileData.lighthouseResult?.categories?.seo?.score || 0) * 100),
      desktop: Math.round((desktopData.lighthouseResult?.categories?.seo?.score || 0) * 100),
    },
  }

  // Core Web Vitals（ミリ秒）
  const coreWebVitals = {
    fcp: {
      mobile: mobileData.lighthouseResult?.audits?.["first-contentful-paint"]?.numericValue || 0,
      desktop: desktopData.lighthouseResult?.audits?.["first-contentful-paint"]?.numericValue || 0,
    },
    lcp: {
      mobile: mobileData.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue || 0,
      desktop:
        desktopData.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue || 0,
    },
    tti: {
      mobile: mobileData.lighthouseResult?.audits?.["interactive"]?.numericValue || 0,
      desktop: desktopData.lighthouseResult?.audits?.["interactive"]?.numericValue || 0,
    },
    tbt: {
      mobile: mobileData.lighthouseResult?.audits?.["total-blocking-time"]?.numericValue || 0,
      desktop: desktopData.lighthouseResult?.audits?.["total-blocking-time"]?.numericValue || 0,
    },
    cls: {
      mobile: mobileData.lighthouseResult?.audits?.["cumulative-layout-shift"]?.numericValue || 0,
      desktop: desktopData.lighthouseResult?.audits?.["cumulative-layout-shift"]?.numericValue || 0,
    },
  }

  // SSL確認
  const hasSSL = url.startsWith("https://")

  // モバイルフレンドリー確認
  const isMobileFriendly = mobileData.lighthouseResult?.audits?.["viewport"]?.score === 1

  return {
    mobileScore,
    desktopScore,
    categories,
    coreWebVitals,
    hasSSL,
    isMobileFriendly,
  }
}
