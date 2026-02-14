/**
 * PPT生成API Route
 * レポートセクション指定時はその内容でPPT生成、未指定時は固定テンプレート
 */

import { NextRequest, NextResponse } from "next/server"
import { generatePPT, generatePPTFromReport } from "@/lib/ppt/generator"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { title, authorName, sections, metadata } = body

    // レポートセクションが渡された場合はエクスポート用PPTを生成
    if (sections && Array.isArray(sections) && sections.length > 0 && metadata?.sessionName) {
      console.log("📊 PPT生成開始（レポート）:", {
        sessionName: metadata.sessionName,
        sectionCount: sections.length,
      })

      const result = await generatePPTFromReport({ sections, metadata })

      console.log("✅ PPT生成完了:", { fileName: result.fileName })

      return NextResponse.json({
        success: true,
        data: {
          fileName: result.fileName,
          base64: result.base64,
          mimeType: result.mimeType,
        },
      })
    }

    // 従来: 固定テンプレート
    console.log("📊 PPT生成開始（テンプレート）:", { title, authorName })

    const result = await generatePPT({
      title,
      authorName,
    })

    console.log("✅ PPT生成完了:", { fileName: result.fileName })

    return NextResponse.json({
      success: true,
      data: {
        fileName: result.fileName,
        base64: result.base64,
        mimeType: result.mimeType,
      },
    })
  } catch (error) {
    console.error("❌ PPT生成エラー:", error)

    return NextResponse.json(
      {
        success: false,
        error: {
          message: "PPTファイルの生成に失敗しました",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    )
  }
}

// GET リクエスト（ヘルスチェック用）
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/tools/generate-presentation",
    description: "PPT生成API（プロトタイプ）",
  })
}
