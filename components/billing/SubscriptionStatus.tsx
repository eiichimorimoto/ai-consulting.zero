/**
 * 現在のプラン状態表示コンポーネント
 */
'use client'

import React from 'react'
import { CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react'
import { PLAN_CONFIG, type PlanType } from '@/lib/plan-config'

interface SubscriptionStatusProps {
  planType: PlanType
  status: string
  appStatus: string
  billingInterval: string | null
  currentPeriodEnd: string | null
  cancelAt: string | null
  trialEnd: string | null
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  active: { icon: <CheckCircle className="w-5 h-5" />, label: 'アクティブ', color: 'text-green-600 bg-green-50' },
  past_due: { icon: <AlertTriangle className="w-5 h-5" />, label: '未払い', color: 'text-yellow-600 bg-yellow-50' },
  canceled: { icon: <XCircle className="w-5 h-5" />, label: '解約済み', color: 'text-gray-600 bg-gray-50' },
  trialing: { icon: <Clock className="w-5 h-5" />, label: 'トライアル中', color: 'text-blue-600 bg-blue-50' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function SubscriptionStatus({
  planType,
  status,
  appStatus,
  billingInterval,
  currentPeriodEnd,
  cancelAt,
  trialEnd,
}: SubscriptionStatusProps) {
  const planMeta = PLAN_CONFIG[planType] || PLAN_CONFIG.free
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.active

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">現在のプラン</h3>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{planMeta.label}</span>
        {billingInterval && (
          <span className="text-sm text-gray-500">
            （{billingInterval === 'yearly' ? '年払い' : '月払い'}）
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600">{planMeta.description}</p>

      {appStatus === 'suspended' && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          ⚠️ お支払いが確認できなかったため、サービスが一時停止されています。
        </div>
      )}

      {cancelAt && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
          📅 {formatDate(cancelAt)} に解約予定です。それまでサービスをご利用いただけます。
        </div>
      )}

      {trialEnd && status === 'trialing' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          🎁 トライアル期間: {formatDate(trialEnd)} まで
        </div>
      )}

      <div className="pt-2 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">次回請求日</span>
          <span className="text-gray-900 font-medium">{formatDate(currentPeriodEnd)}</span>
        </div>
      </div>
    </div>
  )
}
