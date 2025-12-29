import { NextResponse } from 'next/server'
import { executeFix, executeFixes } from '@/lib/auto-fixer'
import { runHealthChecks } from '@/lib/health-monitor'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, actions, autoDetect } = body

    // 自動検出モード: ヘルスチェックを実行して修復可能な問題を自動修復
    if (autoDetect) {
      const report = await runHealthChecks()
      const fixableIssues = report.checks.filter(
        check => check.fixable && check.fixAction && check.status !== 'healthy'
      )
      
      if (fixableIssues.length === 0) {
        return NextResponse.json({
          success: true,
          message: '修復可能な問題は見つかりませんでした',
          fixes: []
        })
      }

      const actionsToFix = fixableIssues
        .map(issue => issue.fixAction!)
        .filter((action, index, self) => self.indexOf(action) === index) // 重複除去

      const results = await executeFixes(actionsToFix)
      
      // 修復後のヘルスチェックを実行
      const newReport = await runHealthChecks()
      
      return NextResponse.json({
        success: true,
        message: `${fixableIssues.length}件の問題を検出し、${actionsToFix.length}件の修復を実行しました`,
        fixes: results,
        beforeReport: report,
        afterReport: newReport
      })
    }

    // 複数のアクションを実行
    if (actions && Array.isArray(actions)) {
      const results = await executeFixes(actions)
      
      return NextResponse.json({
        success: true,
        message: `${actions.length}件の修復を実行しました`,
        fixes: results
      })
    }

    // 単一のアクションを実行
    if (action) {
      const result = await executeFix(action)
      
      return NextResponse.json({
        success: result.success,
        message: result.message,
        fix: result
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'action、actions、またはautoDetectパラメータが必要です'
      },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: '自動修復の実行に失敗しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}

