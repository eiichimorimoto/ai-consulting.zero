/**
 * 未払い警告バナーコンポーネント
 *
 * status=past_due時にダッシュボード上部に表示する。
 *
 * @see stripe-payment-spec-v2.2.md §6-4
 */
"use client"

import React from "react"
import Link from "next/link"
import { AlertTriangle, CreditCard } from "lucide-react"

interface PaymentFailureBannerProps {
  status: string
  appStatus: string
}

export function PaymentFailureBanner({ status, appStatus }: PaymentFailureBannerProps) {
  if (status !== "past_due" && appStatus !== "suspended") return null

  const isSuspended = appStatus === "suspended"

  return (
    <div
      className={`flex items-start gap-3 rounded-xl p-4 ${
        isSuspended ? "border border-red-200 bg-red-50" : "border border-yellow-200 bg-yellow-50"
      }`}
    >
      <AlertTriangle
        className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
          isSuspended ? "text-red-500" : "text-yellow-500"
        }`}
      />
      <div className="flex-1">
        <p className={`text-sm font-medium ${isSuspended ? "text-red-800" : "text-yellow-800"}`}>
          {isSuspended
            ? "お支払いが確認できなかったため、サービスが一時停止されています。"
            : "お支払いが未完了です。早めにお支払い方法を更新してください。"}
        </p>
        <div className="mt-2">
          <Link
            href="/account/billing/update-payment"
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              isSuspended
                ? "text-red-700 hover:text-red-800"
                : "text-yellow-700 hover:text-yellow-800"
            }`}
          >
            <CreditCard size={14} />
            お支払い方法を更新する
          </Link>
        </div>
      </div>
    </div>
  )
}
