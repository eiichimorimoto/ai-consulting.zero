/**
 * レート制限ユーティリティ
 *
 * スライディングウィンドウ方式でAPIリクエストを制限
 * メモリベース実装（将来的にVercel KV/Upstash対応可能）
 *
 * 注意: サーバーレス環境ではインスタンス間でメモリが共有されないため、
 * 本番環境ではVercel KVやUpstash Redisの使用を推奨
 */

import { NextResponse } from 'next/server'

// レート制限の設定タイプ
export interface RateLimitConfig {
  /** 許可するリクエスト数 */
  limit: number
  /** ウィンドウ期間（秒） */
  windowSeconds: number
}

// プリセット設定
export const RATE_LIMIT_PRESETS = {
  /** 診断API: 10回/時間 */
  diagnosis: { limit: 10, windowSeconds: 3600 },
  /** ダッシュボードAPI: 30回/時間 */
  dashboard: { limit: 30, windowSeconds: 3600 },
  /** 企業情報API: 30回/時間 */
  companyIntel: { limit: 30, windowSeconds: 3600 },
  /** 一般API: 100回/時間 */
  general: { limit: 100, windowSeconds: 3600 },
  /** 認証API: 20回/15分 */
  auth: { limit: 20, windowSeconds: 900 },
  // --- Stripe決済API用プリセット（§4-1） ---
  /** Checkout Session作成: 5回/分 */
  stripeCheckout: { limit: 5, windowSeconds: 60 },
  /** Customer Portal: 10回/分 */
  stripePortal: { limit: 10, windowSeconds: 60 },
  /** サブスクリプション状態取得: 30回/分 */
  stripeSubscriptionRead: { limit: 30, windowSeconds: 60 },
  /** 請求書一覧取得: 15回/分 */
  stripeInvoicesRead: { limit: 15, windowSeconds: 60 },
  /** 解約: 3回/分 */
  stripeCancel: { limit: 3, windowSeconds: 60 },
  /** 手動再請求: 3回/分 */
  stripeRetryPayment: { limit: 3, windowSeconds: 60 },
  /** プラン変更: 3回/分 */
  stripeChangePlan: { limit: 3, windowSeconds: 60 },
} as const

// メモリストア（インスタンス単位）
interface RateLimitEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, RateLimitEntry>()

// 定期的にメモリをクリーンアップ（メモリリーク防止）
const CLEANUP_INTERVAL = 60_000 // 1分ごと
let lastCleanup = Date.now()

function cleanupExpiredEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt < now) {
      memoryStore.delete(key)
    }
  }
}

/**
 * レート制限をチェック
 *
 * @param identifier - 識別子（IP、ユーザーID、APIキーなど）
 * @param config - レート制限設定
 * @returns 制限情報
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
} {
  cleanupExpiredEntries()

  const now = Date.now()
  const key = identifier
  const windowMs = config.windowSeconds * 1000

  let entry = memoryStore.get(key)

  // エントリがないか、ウィンドウが期限切れの場合は新規作成
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    }
  }

  // カウントをインクリメント
  entry.count++
  memoryStore.set(key, entry)

  const allowed = entry.count <= config.limit
  const remaining = Math.max(0, config.limit - entry.count)

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    limit: config.limit,
  }
}

/**
 * リクエストからクライアント識別子を取得
 *
 * @param request - Requestオブジェクト
 * @param userId - オプションのユーザーID
 * @returns 識別子文字列
 */
export function getClientIdentifier(
  request: Request,
  userId?: string
): string {
  // ユーザーIDがあれば優先
  if (userId) {
    return `user:${userId}`
  }

  // IPアドレスを取得（Vercel/Cloudflare対応）
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown'

  return `ip:${ip}`
}

/**
 * レート制限ヘッダーを生成
 *
 * @param result - checkRateLimitの結果
 * @returns ヘッダーオブジェクト
 */
export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>): Record<string, string> {
  const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000)

  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(Math.max(1, retryAfterSeconds)) }),
  }
}

/**
 * レート制限エラーレスポンスを生成
 *
 * @param result - checkRateLimitの結果
 * @returns NextResponse
 */
export function createRateLimitResponse(result: ReturnType<typeof checkRateLimit>): NextResponse {
  const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000)

  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: 'リクエスト数が制限を超えました。しばらく待ってから再試行してください。',
      retryAfter: Math.max(1, retryAfterSeconds),
      limit: result.limit,
      resetAt: new Date(result.resetAt).toISOString(),
    },
    {
      status: 429,
      headers: getRateLimitHeaders(result),
    }
  )
}

/**
 * APIルートでレート制限を適用するヘルパー
 *
 * @param request - Requestオブジェクト
 * @param config - レート制限設定（またはプリセット名）
 * @param userId - オプションのユーザーID
 * @returns エラーレスポンス（制限超過時）またはnull（許可時）
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   // レート制限チェック
 *   const rateLimitError = applyRateLimit(request, 'dashboard')
 *   if (rateLimitError) return rateLimitError
 *
 *   // 通常の処理...
 * }
 * ```
 */
export function applyRateLimit(
  request: Request,
  config: RateLimitConfig | keyof typeof RATE_LIMIT_PRESETS,
  userId?: string
): NextResponse | null {
  const resolvedConfig = typeof config === 'string'
    ? RATE_LIMIT_PRESETS[config]
    : config

  const identifier = getClientIdentifier(request, userId)
  const result = checkRateLimit(identifier, resolvedConfig)

  if (!result.allowed) {
    console.warn(`⚠️ Rate limit exceeded for ${identifier}: ${result.limit} requests per ${resolvedConfig.windowSeconds}s`)
    return createRateLimitResponse(result)
  }

  return null
}

/**
 * レスポンスにレート制限ヘッダーを追加
 *
 * @param response - 元のレスポンス
 * @param request - Requestオブジェクト
 * @param config - レート制限設定
 * @param userId - オプションのユーザーID
 * @returns ヘッダー付きレスポンス
 */
export function withRateLimitHeaders(
  response: NextResponse,
  request: Request,
  config: RateLimitConfig | keyof typeof RATE_LIMIT_PRESETS,
  userId?: string
): NextResponse {
  const resolvedConfig = typeof config === 'string'
    ? RATE_LIMIT_PRESETS[config]
    : config

  const identifier = getClientIdentifier(request, userId)
  // カウントせずに現在の状態を取得（既にapplyRateLimitでカウント済み想定）
  const entry = memoryStore.get(identifier)

  if (entry) {
    const headers = getRateLimitHeaders({
      allowed: true,
      remaining: Math.max(0, resolvedConfig.limit - entry.count),
      resetAt: entry.resetAt,
      limit: resolvedConfig.limit,
    })

    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
  }

  return response
}
