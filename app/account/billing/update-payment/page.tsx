/**
 * 支払い方法更新ページ
 *
 * Stripe Customer Portalへの導線。
 * past_due状態のユーザーが支払い方法を更新するために使用。
 *
 * @see stripe-payment-spec-v2.2.md §6-4, §8-1
 */
'use client'

import React from 'react'
import Link from 'next/link'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Header } from '@/components/Header'
import { UpdatePaymentMethod } from '@/components/billing/UpdatePaymentMethod'

export default function UpdatePaymentPage() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />

        <main className="pt-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link
              href="/account/billing"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
            >
              <ArrowLeft size={16} />
              課金管理に戻る
            </Link>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <h1 className="text-2xl font-bold text-gray-900">お支払い方法の更新</h1>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
                お支払い方法の変更はStripeの安全な管理画面で行います。
                下のボタンからStripe管理画面に移動してください。
              </div>

              <UpdatePaymentMethod />
            </m.div>
          </div>
        </main>
      </div>
    </LazyMotion>
  )
}
