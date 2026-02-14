/**
 * リテンションオファー コンポーネント
 *
 * 解約理由が「too_expensive」の場合に表示。
 * 割引クーポンの提示で解約を防止する。
 *
 * @see stripe-payment-spec-v2.2.md §5-1
 */
'use client'

import React, { useState } from 'react'
import { Gift, Loader2 } from 'lucide-react'

interface RetentionOfferProps {
  planType: string
  onDecline: () => void
  onAccept: () => void
}

export function RetentionOffer({ planType, onDecline, onAccept }: RetentionOfferProps) {
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const discountPercent = planType === 'enterprise' ? 20 : 30

  async function handleAcceptOffer() {
    setApplying(true)
    setError(null)

    try {
      // リテンションクーポンを適用
      const res = await fetch('/api/stripe/apply-retention-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPercent }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // 成功：課金管理ページに戻る
        onAccept()
      } else {
        setError(data.error || 'クーポンの適用に失敗しました。')
        setApplying(false)
      }
    } catch {
      setError('エラーが発生しました。')
      setApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100">
          <Gift size={28} className="text-blue-600" />
        </div>

        <h2 className="text-xl font-bold text-gray-900">特別オファーがあります</h2>

        <p className="text-gray-600">
          今なら次の請求から
          <span className="text-blue-600 font-bold text-lg"> {discountPercent}%OFF </span>
          でご利用いただけます。
        </p>

        <div className="rounded-xl bg-white border border-blue-100 p-4 text-sm text-gray-600">
          <p>
            ✓ 次回の請求に{discountPercent}%割引が適用されます
            <br />
            ✓ 現在のプランのすべての機能を継続利用できます
            <br />✓ いつでも通常料金に戻すことができます
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleAcceptOffer}
            disabled={applying}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {applying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                処理中...
              </>
            ) : (
              'オファーを受け取る'
            )}
          </button>
          <button
            onClick={onDecline}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            解約を続ける
          </button>
        </div>
      </div>
    </div>
  )
}
