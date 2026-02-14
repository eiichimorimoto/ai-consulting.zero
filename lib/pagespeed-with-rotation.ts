/**
 * PageSpeed API - 複数キーローテーション対応
 *
 * レート制限を回避するため、複数のAPIキーを順番に使用
 */

const API_KEYS = [
  process.env.GOOGLE_PAGESPEED_API_KEY,
  process.env.GOOGLE_PAGESPEED_API_KEY_2,
  process.env.GOOGLE_PAGESPEED_API_KEY_3,
].filter(Boolean) as string[]

let currentKeyIndex = 0

/**
 * 次のAPIキーを取得（ローテーション）
 */
function getNextApiKey(): string {
  if (API_KEYS.length === 0) {
    throw new Error("PageSpeed APIキーが設定されていません")
  }

  const key = API_KEYS[currentKeyIndex]
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length

  console.log(`🔄 APIキーをローテーション: キー${currentKeyIndex + 1}/${API_KEYS.length}を使用`)

  return key
}

/**
 * PageSpeed API呼び出し（リトライ付き）
 *
 * 429エラーが発生した場合、次のキーで自動リトライ
 */
export async function fetchPageSpeedWithRotation(
  url: string,
  strategy: "mobile" | "desktop",
  maxRetries: number = API_KEYS.length
): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = getNextApiKey()
      const encodedUrl = encodeURIComponent(url)
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodedUrl}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo&key=${apiKey}`

      console.log(`📡 PageSpeed API呼び出し (${strategy}, 試行${attempt + 1}/${maxRetries}):`, {
        url,
        keyIndex: currentKeyIndex,
      })

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      })

      if (response.ok) {
        console.log(`✅ PageSpeed API成功 (${strategy}, キー${currentKeyIndex})`)
        return await response.json()
      }

      // 429エラーの場合は次のキーで再試行
      if (response.status === 429) {
        console.warn(`⚠️ レート制限（キー${currentKeyIndex}）、次のキーで再試行...`)
        lastError = new Error(`Rate limit exceeded on key ${currentKeyIndex}`)
        continue
      }

      // その他のエラーはすぐに投げる
      const errorText = await response.text()
      throw new Error(`PageSpeed API error: ${response.status} ${errorText}`)
    } catch (error) {
      lastError = error as Error
      console.error(`❌ PageSpeed API失敗 (試行${attempt + 1}):`, error)

      // 最後の試行でなければ次のキーで再試行
      if (attempt < maxRetries - 1) {
        continue
      }
    }
  }

  // 全てのキーで失敗した場合
  throw lastError || new Error("All API keys exhausted")
}

/**
 * 現在の利用可能なキー数を取得
 */
export function getAvailableKeyCount(): number {
  return API_KEYS.length
}
