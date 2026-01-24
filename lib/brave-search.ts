/**
 * Brave Search API 共通ユーティリティ
 *
 * 複数のAPIエンドポイントで共通して使用するBrave検索機能を提供
 */

import { fetchWithRetry } from './fetch-with-retry'

// デフォルトのUser-Agent
const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

/**
 * Brave Web検索結果の型定義
 */
export interface BraveWebResult {
  url: string
  title?: string
  description?: string
}

/**
 * Brave Search APIを使用してWeb検索を実行
 *
 * @param query - 検索クエリ
 * @param count - 取得件数（デフォルト: 5）
 * @param timeoutMs - タイムアウト時間（デフォルト: 12秒）
 * @returns 検索結果の配列
 *
 * @example
 * ```typescript
 * const results = await braveWebSearch('株式会社〇〇 会社概要', 5)
 * ```
 */
export async function braveWebSearch(
  query: string,
  count: number = 5,
  timeoutMs: number = 12_000
): Promise<BraveWebResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (!key) {
    console.warn('⚠️ BRAVE_SEARCH_API_KEY が設定されていません')
    return []
  }

  const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`

  try {
    const resp = await fetchWithRetry(
      endpoint,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": key,
          "User-Agent": DEFAULT_UA,
        },
      },
      timeoutMs,
      2 // 最大2回リトライ
    )

    if (!resp.ok) {
      console.warn(`⚠️ Brave Search API エラー: ${resp.status}`)
      return []
    }

    const json = await resp.json() as { web?: { results?: Array<{ url?: string; title?: string; description?: string }> } }
    const items = json?.web?.results || []

    return items
      .map((r) => ({
        url: r?.url || '',
        title: r?.title,
        description: r?.description
      }))
      .filter((r) => typeof r.url === "string" && r.url.length > 0) as BraveWebResult[]

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Brave Search エラー (query: "${query}"): ${message}`)
    return []
  }
}

/**
 * 複数のクエリを並列で検索
 *
 * @param queries - 検索クエリの配列
 * @param countPerQuery - 各クエリの取得件数（デフォルト: 5）
 * @returns 全検索結果の配列
 */
export async function braveWebSearchMultiple(
  queries: string[],
  countPerQuery: number = 5
): Promise<BraveWebResult[]> {
  const results = await Promise.all(
    queries.map(query => braveWebSearch(query, countPerQuery))
  )
  return results.flat()
}
