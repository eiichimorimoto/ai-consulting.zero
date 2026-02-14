/**
 * Checkout キャンセルページ
 *
 * Stripe Checkoutを中断した場合に表示する静的ページ。
 */
"use client"

import React from "react"
import Link from "next/link"
import { LazyMotion, domAnimation, m } from "framer-motion"
import { XCircle, ArrowLeft, CreditCard } from "lucide-react"
import AppHeader from "@/components/AppHeader"

export default function CheckoutCancelPage() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <AppHeader />

        <main className="pt-20">
          <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
            <m.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6 text-center"
            >
              <div className="flex justify-center">
                <XCircle className="h-16 w-16 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">お支払いがキャンセルされました</h1>
              <p className="text-gray-600">
                決済手続きが中断されました。
                <br />
                プランの変更はいつでも行えます。
              </p>
              <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <CreditCard size={18} />
                  プランを選び直す
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  <ArrowLeft size={18} />
                  ダッシュボードへ戻る
                </Link>
              </div>
            </m.div>
          </div>
        </main>
      </div>
    </LazyMotion>
  )
}
