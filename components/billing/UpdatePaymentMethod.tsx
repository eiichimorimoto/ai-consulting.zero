/**
 * 支払い方法更新 コンポーネント
 *
 * Stripe Customer Portalへリダイレクトして支払い方法を更新する。
 * Portal内でカード変更等が完了する。
 *
 * @see stripe-payment-spec-v2.2.md §6-4
 */
'use client'

import React, { useState } from 'react'
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react'

export function UpdatePaymentMethod() {
  const [loading, setLoading] = useState(false)

  async function handleUpdate() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }
      alert('ポータルの生成に失敗しました。')
    } catch {
      alert('エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
          <CreditCard size={20} className="text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">お支払い方法の更新</h3>
          <p className="text-sm text-gray-500">
            クレジットカード情報の変更はStripe管理画面で行います
          </p>
        </div>
      </div>

      <button
        onClick={handleUpdate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            読み込み中...
          </>
        ) : (
          <>
            <ExternalLink size={16} />
            支払い方法を更新する
          </>
        )}
      </button>
    </div>
  )
}
