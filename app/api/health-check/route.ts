import { NextResponse } from 'next/server'
import { runHealthChecks } from '@/lib/health-monitor'

export async function GET() {
  try {
    const report = await runHealthChecks()
    
    return NextResponse.json({
      success: true,
      report
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'ヘルスチェックの実行に失敗しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}

