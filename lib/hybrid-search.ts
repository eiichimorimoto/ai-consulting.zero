/**
 * ハイブリッドWeb検索
 * 
 * Google Custom Search APIを優先し、エラー時にBrave Search APIにフォールバック
 */

import { googleCustomSearch, isGoogleSearchAvailable, type GoogleSearchResult } from './google-search'
import { braveWebSearch, type BraveWebResult } from './brave-search'

/**
 * 統一検索結果の型定義
 */
export interface HybridSearchResult {
  url: string
  title: string
  description: string
  source: 'google' | 'brave' // どちらのAPIから取得したか
}

/**
 * ハイブリッドWeb検索を実行
 * 
 * Google Custom Search APIを優先し、以下の場合にBrave Search APIにフォールバック：
 * - Google APIキー未設定
 * - Google APIエラー（クォータ超過、APIキー無効など）
 * - Google検索結果が0件
 * 
 * @param query - 検索クエリ
 * @param count - 取得件数（デフォルト: 3）
 * @returns 検索結果の配列とソース情報
 * 
 * @example
 * ```typescript
 * const { results, source, fallback } = await hybridWebSearch('中小企業 売上向上', 3)
 * console.log(`検索ソース: ${source}`)
 * if (fallback) console.log(`フォールバック理由: ${fallback.reason}`)
 * ```
 */
export async function hybridWebSearch(
  query: string,
  count: number = 3
): Promise<{
  results: HybridSearchResult[]
  source: 'google' | 'brave'
  fallback?: {
    reason: string
    originalError?: string
  }
}> {
  // Google Custom Search APIが利用可能かチェック
  if (!isGoogleSearchAvailable()) {
    console.log('ℹ️ Google Custom Search API未設定。Brave Search APIを使用します。')
    return await useBraveSearch(query, count, 'Google API未設定')
  }
  
  // Google Custom Search API試行
  try {
    console.log('🔍 Google Custom Search APIで検索中...')
    
    const googleResults = await googleCustomSearch(query, count)
    
    // 結果が0件の場合はBraveにフォールバック
    if (googleResults.length === 0) {
      console.log('⚠️ Google検索結果が0件。Brave Search APIにフォールバック。')
      return await useBraveSearch(query, count, 'Google検索結果が0件')
    }
    
    // Google検索成功
    const results: HybridSearchResult[] = googleResults.map(r => ({
      url: r.url,
      title: r.title || 'タイトルなし',
      description: r.description || '説明なし',
      source: 'google' as const
    }))
    
    console.log(`✅ Google Custom Search: ${results.length}件取得成功`)
    
    return {
      results,
      source: 'google'
    }
    
  } catch (error) {
    // Googleでエラー → Braveにフォールバック
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    console.warn(`⚠️ Google Custom Search APIエラー: ${errorMessage}`)
    console.log('🔄 Brave Search APIにフォールバック...')
    
    // エラー理由を分類
    let fallbackReason = 'Google APIエラー'
    
    if (errorMessage.includes('QUOTA_EXCEEDED')) {
      fallbackReason = 'Google API 1日の制限（100クエリ）に達しました'
    } else if (errorMessage.includes('INVALID_API_KEY')) {
      fallbackReason = 'Google APIキーが無効です'
    } else if (errorMessage.includes('INVALID_SEARCH_ENGINE_ID')) {
      fallbackReason = 'Google Search Engine IDが無効です'
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      fallbackReason = 'Google APIタイムアウト'
    }
    
    return await useBraveSearch(query, count, fallbackReason, errorMessage)
  }
}

/**
 * Brave Search APIを使用（内部ヘルパー関数）
 */
async function useBraveSearch(
  query: string,
  count: number,
  fallbackReason: string,
  originalError?: string
): Promise<{
  results: HybridSearchResult[]
  source: 'brave'
  fallback: {
    reason: string
    originalError?: string
  }
}> {
  try {
    const braveResults = await braveWebSearch(query, count)
    
    const results: HybridSearchResult[] = braveResults.map(r => ({
      url: r.url,
      title: r.title || 'タイトルなし',
      description: r.description || '説明なし',
      source: 'brave' as const
    }))
    
    console.log(`✅ Brave Search（フォールバック）: ${results.length}件取得成功`)
    
    return {
      results,
      source: 'brave',
      fallback: {
        reason: fallbackReason,
        originalError
      }
    }
    
  } catch (braveError) {
    // Braveでもエラーの場合
    const braveErrorMessage = braveError instanceof Error ? braveError.message : String(braveError)
    
    console.error('❌ Brave Search APIもエラー:', braveErrorMessage)
    
    // 両方エラーの場合は空配列を返す
    return {
      results: [],
      source: 'brave',
      fallback: {
        reason: `${fallbackReason} → Brave APIもエラー`,
        originalError: `Google: ${originalError || 'N/A'}, Brave: ${braveErrorMessage}`
      }
    }
  }
}
