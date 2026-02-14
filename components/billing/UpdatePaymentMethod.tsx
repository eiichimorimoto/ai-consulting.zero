/**
 * 支払い方法更新 コンポーネント
 *
 * Stripe Customer Portalへリダイレクトして支払い方法を更新する。
 * Portal内でカード変更等が完了する。
 *
 * @see stripe-payment-spec-v2.2.md §6-4
 */
"use client"

import React, { useState } from "react"
import { CreditCard, ExternalLink, Loader2 } from "lucide-react"

export function UpdatePaymentMethod() {
  const [loading, setLoading] = useState(false)

  async function handleUpdate() {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/create-portal", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }
      alert("ポータルの生成に失敗しました。")
    } catch {
      alert("エラーが発生しました。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
