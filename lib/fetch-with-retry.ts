/**
 * リトライロジック付きfetch（指数バックオフ）
 * 
 * 429 (Too Many Requests) または 529 (Overloaded) エラー時に自動リトライ
 * 
 * @param input - fetch の第1引数（URL or Request）
 * @param init - fetch の第2引数（RequestInit）
 * @param timeoutMs - タイムアウト時間（ミリ秒、デフォルト: 30秒）
 * @param maxRetries - 最大リトライ回数（デフォルト: 3回）
 * @returns Promise<Response>
 * 
 * @example
 * ```typescript
 * const response = await fetchWithRetry('https://api.example.com/data', {
 *   method: 'GET',
 *   headers: { 'Authorization': 'Bearer token' }
 * })
 * ```
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = 30_000,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      // 429 (Too Many Requests) または 529 (Overloaded) の場合はリトライ
      if (response.status === 429 || response.status === 529) {
        const waitTime = Math.pow(2, attempt) * 1000 // 指数バックオフ: 1秒 → 2秒 → 4秒
        const errorType = response.status === 429 ? 'Rate limit' : 'Server overload'
        console.warn(
          `⚠️ ${errorType} (${response.status}) detected. ` +
          `Retrying attempt ${attempt + 1}/${maxRetries + 1} after ${waitTime}ms...`
        )
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue // 次のループでリトライ
      }
      
      // 成功またはその他のエラー（リトライ対象外）の場合はそのまま返す
      return response
      
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error as Error
      
      // 最後の試行でない場合はリトライ
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000
        console.warn(
          `⚠️ Request failed (attempt ${attempt + 1}/${maxRetries + 1}). ` +
          `Retrying after ${waitTime}ms... Error: ${lastError.message}`
        )
        await new Promise(resolve => setTimeout(resolve, waitTime))
      } else {
        // 最後の試行でもエラーの場合は投げる
        throw error
      }
    }
  }
  
  // すべてのリトライが失敗した場合
  throw lastError || new Error('リトライが失敗しました')
}

/**
 * タイムアウト付きfetch（内部でfetchWithRetryを使用）
 * 
 * @param input - fetch の第1引数
 * @param init - fetch の第2引数
 * @param timeoutMs - タイムアウト時間（ミリ秒、デフォルト: 30秒）
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = 30_000
): Promise<Response> {
  return fetchWithRetry(input, init, timeoutMs, 3)
}
