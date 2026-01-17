import { NextResponse } from 'next/server'

/**
 * Google Maps APIキーをサーバーサイドで取得してクライアントに返す
 * これにより、NEXT_PUBLIC_プレフィックスなしの環境変数も使用可能
 */
export async function GET() {
  // 複数の環境変数名に対応（どちらかが設定されていればOK）
  const apiKey = 
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
    process.env.GOOGLE_MAPS_API_KEY ||
    ''

  console.log('🗺️ [google-maps-config] APIキー確認:', {
    hasNextPublicKey: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    hasRegularKey: !!process.env.GOOGLE_MAPS_API_KEY,
    keyLength: apiKey.length,
  })

  if (!apiKey) {
    return NextResponse.json(
      { 
        error: 'Google Maps APIキーが設定されていません',
        details: 'Vercelの環境変数に NEXT_PUBLIC_GOOGLE_MAPS_API_KEY または GOOGLE_MAPS_API_KEY を設定してください'
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ apiKey })
}
