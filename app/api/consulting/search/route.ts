/**
 * Web検索API（ハイブリッド版）
 * 
 * Google Custom Search APIを優先し、エラー時にBrave Search APIにフォールバック
 * 
 * @endpoint POST /api/consulting/search
 * @param {string} query - 検索クエリ
 * @returns {SearchResult[]} 検索結果（最大3件）
 */

import { NextRequest, NextResponse } from 'next/server'
import { hybridWebSearch } from '@/lib/hybrid-search'

export interface SearchResult {
  url: string
  title: string
  description: string
}

export async function POST(request: NextRequest) {
  try {
    // 1. 入力検証
    const body = await request.json()
    const { query } = body
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: '検索クエリが無効です' },
        { status: 400 }
      )
    }
    
    if (query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '検索クエリを入力してください' },
        { status: 400 }
      )
    }
    
    if (query.length > 500) {
      return NextResponse.json(
        { success: false, error: '検索クエリが長すぎます（最大500文字）' },
        { status: 400 }
      )
    }
    
    // 2. ハイブリッド検索実行（Google優先、エラー時にBraveフォールバック）
    const { results, source, fallback } = await hybridWebSearch(query, 3)
    
    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: '検索結果が見つかりませんでした',
        source,
        fallback
      })
    }
    
    // 3. 結果整形
    const formattedResults: SearchResult[] = results.map(r => ({
      url: r.url,
      title: r.title,
      description: r.description
    }))
    
    // 4. 結果返却（ソース情報も含む）
    return NextResponse.json({
      success: true,
      results: formattedResults,
      source, // 'google' または 'brave'
      fallback // フォールバック情報（存在する場合）
    })
    
  } catch (error) {
    console.error('Search API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    
    return NextResponse.json(
      { 
        success: false, 
        error: '検索中にエラーが発生しました',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
