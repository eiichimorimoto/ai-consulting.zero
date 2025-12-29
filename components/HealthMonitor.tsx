'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, RefreshCw, Wrench, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error'
  category: string
  message: string
  details?: any
  fixable: boolean
  fixAction?: string
}

interface HealthReport {
  overall: 'healthy' | 'warning' | 'error'
  checks: HealthCheckResult[]
  timestamp: string
}

interface FixResult {
  success: boolean
  message: string
  action: string
  details?: any
}

export default function HealthMonitor() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [autoCheck, setAutoCheck] = useState(true)
  const [fixResults, setFixResults] = useState<FixResult[]>([])
  const [isMinimized, setIsMinimized] = useState(false)

  // ヘルスチェックを実行
  const runHealthCheck = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/health-check')
      const data = await response.json()
      
      if (data.success) {
        setReport(data.report)
        setLastCheck(new Date())
      } else {
        console.error('Health check failed:', data.error)
      }
    } catch (error: any) {
      console.error('Health check error:', error)
    } finally {
      setIsChecking(false)
    }
  }

  // 自動修復を実行
  const runAutoFix = async () => {
    setIsFixing(true)
    setFixResults([])
    
    try {
      const response = await fetch('/api/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDetect: true })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setFixResults(data.fixes || [])
        // 修復後に再チェック
        setTimeout(() => {
          runHealthCheck()
        }, 1000)
      } else {
        console.error('Auto fix failed:', data.error)
      }
    } catch (error: any) {
      console.error('Auto fix error:', error)
    } finally {
      setIsFixing(false)
    }
  }

  // 初回チェックと自動チェック設定
  useEffect(() => {
    runHealthCheck()
    
    if (autoCheck) {
      // 5分ごとに自動チェック
      const interval = setInterval(() => {
        runHealthCheck()
      }, 5 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [autoCheck])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />
      case 'warning':
      case 'error':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return '正常'
      case 'warning':
        return '警告'
      case 'error':
        return 'エラー'
      default:
        return status
    }
  }

  if (!report) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            システム監視
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">ヘルスチェックを実行中...</p>
        </CardContent>
      </Card>
    )
  }

  const errorCount = report.checks.filter(c => c.status === 'error').length
  const warningCount = report.checks.filter(c => c.status === 'warning').length
  const fixableCount = report.checks.filter(c => c.fixable && c.status !== 'healthy').length

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(report.overall)}
            <CardTitle>システム監視</CardTitle>
            <Badge className={getStatusColor(report.overall)}>
              {getStatusLabel(report.overall)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? '展開' : '折りたたむ'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={runHealthCheck}
              disabled={isChecking}
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          {lastCheck && `最終チェック: ${lastCheck.toLocaleTimeString('ja-JP')}`}
          {errorCount > 0 && ` | エラー: ${errorCount}件`}
          {warningCount > 0 && ` | 警告: ${warningCount}件`}
          {fixableCount > 0 && ` | 修復可能: ${fixableCount}件`}
        </CardDescription>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="space-y-4">
          {/* 全体ステータス */}
          {report.overall !== 'healthy' && (
            <Alert className={getStatusColor(report.overall)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>システムに問題が検出されました</AlertTitle>
              <AlertDescription>
                {errorCount > 0 && `${errorCount}件のエラー`}
                {errorCount > 0 && warningCount > 0 && '、'}
                {warningCount > 0 && `${warningCount}件の警告`}が検出されました。
                {fixableCount > 0 && ' 自動修復を実行できます。'}
              </AlertDescription>
            </Alert>
          )}

          {/* 修復結果 */}
          {fixResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">修復結果</h4>
              {fixResults.map((result, index) => (
                <Alert
                  key={index}
                  className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
                >
                  <AlertDescription>
                    {result.success ? '✓' : '✗'} {result.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* 自動修復ボタン */}
          {fixableCount > 0 && (
            <Button
              onClick={runAutoFix}
              disabled={isFixing}
              className="w-full"
              variant={report.overall === 'error' ? 'destructive' : 'default'}
            >
              {isFixing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  修復中...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  自動修復を実行 ({fixableCount}件)
                </>
              )}
            </Button>
          )}

          {/* チェック結果の詳細 */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">チェック結果</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {report.checks.map((check, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getStatusColor(check.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(check.status)}
                        <span className="font-semibold text-sm">{check.category}</span>
                        <Badge variant="outline" className="text-xs">
                          {getStatusLabel(check.status)}
                        </Badge>
                        {check.fixable && (
                          <Badge variant="secondary" className="text-xs">
                            修復可能
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{check.message}</p>
                      {check.details && (
                        <p className="text-xs text-gray-500 mt-1">
                          {typeof check.details === 'object'
                            ? JSON.stringify(check.details, null, 2)
                            : check.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 自動チェック設定 */}
          <div className="flex items-center justify-between pt-2 border-t">
            <label className="text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoCheck}
                onChange={(e) => setAutoCheck(e.target.checked)}
                className="mr-2"
              />
              5分ごとに自動チェック
            </label>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

