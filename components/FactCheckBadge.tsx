'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Shield, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface FactCheckItem {
  category: string
  field: string
  passed: boolean
  message: string
  severity: 'info' | 'warning' | 'error'
  suggestion?: string
}

interface FactCheckResult {
  passed: boolean
  confidence: number
  level: 'verified' | 'high' | 'medium' | 'low' | 'unverified'
  checks: FactCheckItem[]
  summary: string
  timestamp: string
}

interface FactCheckBadgeProps {
  result: FactCheckResult
  showDetails?: boolean
  compact?: boolean
}

export default function FactCheckBadge({ result, showDetails = true, compact = false }: FactCheckBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getLevelColor = (level: FactCheckResult['level']) => {
    switch (level) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'high':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'unverified':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getLevelIcon = (level: FactCheckResult['level']) => {
    switch (level) {
      case 'verified':
        return <CheckCircle className="w-4 h-4" />
      case 'high':
        return <Shield className="w-4 h-4" />
      case 'medium':
        return <Info className="w-4 h-4" />
      case 'low':
        return <AlertTriangle className="w-4 h-4" />
      case 'unverified':
        return <XCircle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getLevelLabel = (level: FactCheckResult['level']) => {
    switch (level) {
      case 'verified':
        return '検証済み'
      case 'high':
        return '信頼度: 高'
      case 'medium':
        return '信頼度: 中'
      case 'low':
        return '信頼度: 低'
      case 'unverified':
        return '未検証'
      default:
        return level
    }
  }

  const getSeverityIcon = (severity: FactCheckItem['severity']) => {
    switch (severity) {
      case 'info':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />
      default:
        return <Info className="w-3.5 h-3.5 text-gray-500" />
    }
  }

  if (compact) {
    return (
      <Badge className={`${getLevelColor(result.level)} flex items-center gap-1 cursor-help`} title={result.summary}>
        {getLevelIcon(result.level)}
        <span>{result.confidence}%</span>
      </Badge>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`rounded-lg border p-3 ${getLevelColor(result.level)}`}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getLevelIcon(result.level)}
              <span className="font-semibold text-sm">{getLevelLabel(result.level)}</span>
              <span className="text-xs opacity-75">({result.confidence}%)</span>
            </div>
            {showDetails && (
              <div className="flex items-center gap-1 text-xs">
                {result.checks.length}件のチェック
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            )}
          </div>
          <p className="text-xs mt-1 text-left opacity-80">{result.summary}</p>
        </CollapsibleTrigger>

        {showDetails && (
          <CollapsibleContent>
            <div className="mt-3 space-y-2 border-t pt-3">
              {result.checks.map((check, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded text-xs ${
                    check.severity === 'error'
                      ? 'bg-red-50'
                      : check.severity === 'warning'
                      ? 'bg-yellow-50'
                      : 'bg-white/50'
                  }`}
                >
                  {getSeverityIcon(check.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{check.field}</span>
                      <span className="text-gray-500">({check.category})</span>
                    </div>
                    <p className={check.passed ? 'text-gray-700' : 'text-gray-900 font-medium'}>
                      {check.message}
                    </p>
                    {check.suggestion && (
                      <p className="text-blue-600 mt-1">💡 {check.suggestion}</p>
                    )}
                  </div>
                  {check.passed ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500 text-right">
              チェック日時: {new Date(result.timestamp).toLocaleString('ja-JP')}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  )
}

/**
 * インラインバッジ - 小さなスペースに表示
 */
export function FactCheckInlineBadge({ result }: { result: FactCheckResult }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        result.level === 'verified' || result.level === 'high'
          ? 'bg-green-100 text-green-700'
          : result.level === 'medium'
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-red-100 text-red-700'
      }`}
      title={result.summary}
    >
      {result.level === 'verified' || result.level === 'high' ? (
        <CheckCircle className="w-3 h-3" />
      ) : result.level === 'medium' ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {result.confidence}%
    </span>
  )
}

