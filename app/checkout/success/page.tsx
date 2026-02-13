/**
 * Checkout 成功ページ
 *
 * 決済完了後に表示。5秒間隔ポーリングでWebhook反映を待ち、
 * サブスクリプションがアクティブになったら完了メッセージを表示。
 *
 * @see stripe-payment-spec-v2.2.md §8-1
 */
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { CheckCircle, Loader2, Clock, ArrowRight } from 'lucide-react'
import { Header } from '@/components/Header'

const POLL_INTERVAL = 5000 // 5秒
const MAX_POLL_DURATION = 60000 // 60秒

type PollingStatus = 'polling' | 'confirmed' | 'timeout'

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState<PollingStatus>('polling')
  const [planType, setPlanType] = useState<string | null>(null)

  const pollSubscription = useCallback(async () => {
    const startTime = Date.now()

    const poll = async () => {
      try {
        const res = await fetch('/api/stripe/subscription')
        if (res.ok) {
          const data = await res.json()
          const sub = data.subscription
          if (sub.has_stripe_subscription && sub.status === 'active') {
            setPlanType(sub.plan_type)
            setStatus('confirmed')
            return
          }
        }
      } catch {
        // ネットワークエラーはリトライ
      }

      // タイムアウト判定
      if (Date.now() - startTime >= MAX_POLL_DURATION) {
        setStatus('timeout')
        return
      }

      // 次のポーリング
      setTimeout(poll, POLL_INTERVAL)
    }

    poll()
  }, [])

  useEffect(() => {
    pollSubscription()
  }, [pollSubscription])

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />

        <main className="pt-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <m.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              {/* ポーリング中 */}
              {status === 'polling' && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    お支払いを確認しています...
                  </h1>
                  <p className="text-gray-600">
                    決済情報の反映にはしばらくお時間がかかる場合があります。
                    <br />
                    このページを閉じずにお待ちください。
                  </p>
                </div>
              )}

              {/* 確認完了 */}
              {status === 'confirmed' && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    お支払いが完了しました！
                  </h1>
                  <p className="text-gray-600">
                    {planType === 'pro' && 'Proプラン'}
                    {planType === 'enterprise' && 'Enterpriseプラン'}
                    へのアップグレードが完了しました。
                    <br />
                    AIコンサルティング機能をフルにご活用ください。
                  </p>
                  <div className="pt-4">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                      ダッシュボードへ
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              )}

              {/* タイムアウト */}
              {status === 'timeout' && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <Clock className="w-16 h-16 text-yellow-500" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    反映までもう少しお待ちください
                  </h1>
                  <p className="text-gray-600">
                    お支払いは正常に処理されましたが、システムへの反映に通常より時間がかかっています。
                    <br />
                    数分後にダッシュボードでご確認ください。
                  </p>
                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                      ダッシュボードへ
                      <ArrowRight size={18} />
                    </Link>
                    <Link
                      href="/account/billing"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                      課金管理を確認
                    </Link>
                  </div>
                </div>
              )}
            </m.div>
          </div>
        </main>
      </div>
    </LazyMotion>
  )
}
