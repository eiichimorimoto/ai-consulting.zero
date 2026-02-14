/**
 * Google Custom Search API ユーティリティ
 *
 * Google Custom Search APIを使用してWeb検索を実行
 */

/**
 * Google検索結果の型定義
 */
export interface GoogleSearchResult {
  url: string
  title?: string
  description?: string
}

/**
 * Google Custom Search APIを使用してWeb検索を実行
 *
 * @param query - 検索クエリ
 * @param count - 取得件数（デフォルト: 3、最大: 10）
 * @returns 検索結果の配列
 *
 * @throws APIキーまたはSearch Engine IDが未設定の場合
 * @throws API呼び出しが失敗した場合
 *
 * @example
 * ```typescript
 * const results = await googleCustomSearch('中小企業 売上向上', 3)
 * ```
 */
export async function googleCustomSearch(
  query: string,
  count: number = 3
): Promise<GoogleSearchResult[]> {
  // 環境変数チェック
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim()
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID?.trim()

  if (!apiKey) {
    throw new Error("GOOGLE_CUSTOM_SEARCH_API_KEY が設定されていません")
  }

  if (!searchEngineId) {
    throw new Error("GOOGLE_SEARCH_ENGINE_ID が設定されていません")
  }

  // クエリパラメータ構築
  const params = new URLSearchParams({
    key: apiKey,
    cx: searchEngineId,
    q: query,
    num: Math.min(count, 10).toString(), // 最大10件
    lr: "lang_ja", // 日本語優先
    gl: "jp", // 日本からの検索
  })

  const endpoint = `https://www.googleapis.com/customsearch/v1?${params.toString()}`

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })

    // ステータスコードチェック
    if (!response.ok) {
      const errorText = await response.text()

      // 429: クォータ超過
      if (response.status === 429) {
        throw new Error(
          "QUOTA_EXCEEDED: Google Custom Search APIの1日の制限（100クエリ）に達しました"
        )
      }

      // 403: APIキー無効
      if (response.status === 403) {
        throw new Error("INVALID_API_KEY: Google Custom Search APIキーが無効です")
      }

      // 400: Search Engine ID無効
      if (response.status === 400 && errorText.includes("Invalid Value")) {
        throw new Error("INVALID_SEARCH_ENGINE_ID: Google Search Engine IDが無効です")
      }

      throw new Error(`Google Custom Search APIエラー: ${response.status} - ${errorText}`)
    }

    // レスポンス解析
    const data = await response.json()

    // 検索結果の取得
    const items = data.items || []

    if (items.length === 0) {
      console.log("⚠️ Google Custom Search: 検索結果が0件でした")
      return []
    }

    // 結果の整形
    const results: GoogleSearchResult[] = items
      .map((item: any) => ({
        url: item.link || "",
        title: item.title || "タイトルなし",
        description: item.snippet || "説明なし",
      }))
      .filter((r: GoogleSearchResult) => r.url.length > 0)

    console.log(`✅ Google Custom Search: ${results.length}件の結果を取得`)

    return results
  } catch (error) {
    // ネットワークエラーなど
    if (error instanceof Error) {
      // エラーメッセージをそのまま再スロー
      throw error
    }

    throw new Error(`Google Custom Search API呼び出しエラー: ${String(error)}`)
  }
}

/**
 * Google Custom Search APIが利用可能かチェック
 *
 * @returns 利用可能な場合はtrue
 */
export function isGoogleSearchAvailable(): boolean {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim()
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID?.trim()

  return !!(apiKey && searchEngineId)
}
