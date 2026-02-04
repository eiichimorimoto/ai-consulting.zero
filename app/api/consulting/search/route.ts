/**
 * Web検索API
 * 
 * Brave Search APIを使用してWeb検索を実行
 * 
 * @endpoint POST /api/consulting/search
 * @param {string} query - 検索クエリ
 * @returns {SearchResult[]} 検索結果（最大3件）
 */

import { NextRequest, NextResponse } from 'next/server'
import { braveWebSearch } from '@/lib/brave-search'

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
    
    // 2. Brave Search実行（3件取得）
    const results = await braveWebSearch(query, 3)
    
    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: '検索結果が見つかりませんでした'
      })
    }
    
    // 3. 結果整形
    const formattedResults: SearchResult[] = results.map(r => ({
      url: r.url,
      title: r.title || 'タイトルなし',
      description: r.description || '説明なし'
    }))
    
    // 4. 結果返却
    return NextResponse.json({
      success: true,
      results: formattedResults
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
