/**
 * PPT生成API Route
 * プロトタイプ: 固定テンプレートでPPTを生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePPT } from '@/lib/ppt/generator';

export const runtime = 'nodejs'; // Node.jsランタイムを使用（pptxgenjs用）

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得（オプション）
    const body = await request.json().catch(() => ({}));
    const { title, authorName } = body;

    console.log('📊 PPT生成開始:', { title, authorName });

    // PPT生成
    const result = await generatePPT({
      title,
      authorName,
    });

    console.log('✅ PPT生成完了:', {
      fileName: result.fileName,
      size: `${(result.base64.length / 1024).toFixed(2)} KB`,
    });

    // Base64データを返却
    return NextResponse.json({
      success: true,
      data: {
        fileName: result.fileName,
        base64: result.base64,
        mimeType: result.mimeType,
      },
    });
  } catch (error) {
    console.error('❌ PPT生成エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'PPTファイルの生成に失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

// GET リクエスト（ヘルスチェック用）
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/tools/generate-presentation',
    description: 'PPT生成API（プロトタイプ）',
  });
}
