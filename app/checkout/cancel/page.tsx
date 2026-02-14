/**
 * Checkout キャンセルページ
 *
 * Stripe Checkoutを中断した場合に表示する静的ページ。
 */
'use client'

import React from 'react'
import Link from 'next/link'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react'
import AppHeader from '@/components/AppHeader'

export default function CheckoutCancelPage() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <AppHeader />

        <main className="pt-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <m.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <XCircle className="w-16 h-16 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                お支払いがキャンセルされました
              </h1>
              <p className="text-gray-600">
                決済手続きが中断されました。
                <br />
                プランの変更はいつでも行えます。
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  <CreditCard size={18} />
                  プランを選び直す
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
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
