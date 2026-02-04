/**
 * 検索結果要約API
 * 
 * Google Gemini 1.5 Flashを使用して検索結果を箇条書き形式で要約
 * 
 * @endpoint POST /api/consulting/search/summarize
 * @param {string} query - 検索クエリ
 * @param {SearchResult[]} results - 検索結果
 * @returns {string} summary - 箇条書き要約
 * @returns {string[]} sources - 参考URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface SearchResult {
  url: string
  title: string
  description: string
}

export async function POST(request: NextRequest) {
  try {
    // 1. 入力検証
    const body = await request.json()
    const { query, results } = body
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: '検索クエリが無効です' },
        { status: 400 }
      )
    }
    
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { success: false, error: '検索結果が無効です' },
        { status: 400 }
      )
    }
    
    // 2. Gemini API設定
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured')
      return NextResponse.json(
        { success: false, error: 'Gemini API設定エラー' },
        { status: 500 }
      )
    }
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    // 3. プロンプト構築
    const searchResultsText = results
      .map((r: SearchResult, i: number) => `
検索結果${i + 1}:
タイトル: ${r.title}
説明: ${r.description}
URL: ${r.url}
      `.trim())
      .join('\n\n')
    
    const prompt = `あなたは情報要約の専門家です。
以下の検索結果を、ビジネスコンサルティングの文脈で箇条書き形式で要約してください。

検索キーワード: ${query}

${searchResultsText}

要件:
- 箇条書き形式（3-5個のポイント）
- 各ポイントは簡潔に（30-50文字）
- 重要な数値やデータを含める
- ビジネス判断に役立つ情報を優先
- 各ポイントは「•」（中黒）で始める

出力形式:
• ポイント1
• ポイント2
• ポイント3
• ポイント4（オプション）
• ポイント5（オプション）

注意: 参考URLは含めないでください（別途処理します）`
    
    // 4. Gemini API呼び出し
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `あなたは情報要約の専門家です。検索結果を簡潔な箇条書きで要約します。\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    })
    
    const response = await result.response
    const summary = response.text() || ''
    
    if (!summary) {
      throw new Error('要約生成に失敗しました')
    }
    
    // 5. 参考URL抽出
    const sources = results.map((r: SearchResult) => r.url).filter(Boolean)
    
    // 6. 結果返却
    return NextResponse.json({
      success: true,
      summary: summary.trim(),
      sources
    })
    
  } catch (error) {
    console.error('Summarize API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    
    // Gemini APIのエラーハンドリング
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'タイムアウトしました。もう一度お試しください。',
          retryable: true
        },
        { status: 504 }
      )
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('rate_limit') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'API制限に達しました。しばらく待ってからお試しください。',
          retryable: true
        },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '要約生成中にエラーが発生しました',
        details: errorMessage,
        retryable: true
      },
      { status: 500 }
    )
  }
}
