/**
 * レポート生成API Route
 * Puppeteerを使用してPDF生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePDFReport } from '@/lib/report/pdf-generator';
import type { PDFGenerateOptions } from '@/lib/report/types';

export const runtime = 'nodejs'; // Node.jsランタイムを使用（Puppeteer用）
export const maxDuration = 60; // 最大60秒（初回Chromiumダウンロード対応）

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    const { sections, metadata } = body as PDFGenerateOptions;

    // バリデーション
    if (!sections || sections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'セクションが選択されていません' },
        },
        { status: 400 }
      );
    }

    if (!metadata || !metadata.sessionName) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'メタデータが不足しています' },
        },
        { status: 400 }
      );
    }

    console.log('📄 PDF生成開始:', {
      sessionName: metadata.sessionName,
      sectionCount: sections.length,
    });

    // PDF生成
    const startTime = Date.now();
    const result = await generatePDFReport({ sections, metadata });
    const duration = Date.now() - startTime;

    console.log('✅ PDF生成完了:', {
      fileName: result.fileName,
      size: `${(result.buffer.length / 1024).toFixed(2)} KB`,
      duration: `${duration}ms`,
    });

    // Bufferをbase64に変換
    const base64 = result.buffer.toString('base64');

    // Base64データを返却
    return NextResponse.json({
      success: true,
      data: {
        fileName: result.fileName,
        base64,
        mimeType: result.mimeType,
      },
    });
  } catch (error) {
    console.error('❌ PDF生成エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'PDFファイルの生成に失敗しました',
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
    endpoint: '/api/tools/generate-report',
    description: 'レポート生成API（Puppeteer使用）',
  });
}
