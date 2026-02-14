/**
 * 解約ページ
 *
 * ステップウィザード形式で解約理由→リテンション→確認→実行を行う。
 *
 * @see stripe-payment-spec-v2.2.md §5-1, §8-1
 */
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { CancelFlow } from '@/components/billing/CancelFlow'

interface SubscriptionData {
  plan_type: string
  status: string
  current_period_end: string | null
  cancel_at: string | null
  has_stripe_subscription: boolean
}

export default function CancelPage() {
  const router = useRouter()
  const [sub, setSub] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch('/api/stripe/subscription')
        if (res.ok) {
          const data = await res.json()
          setSub(data.subscription)
        }
      } catch {
        // エラー時はnull
      } finally {
        setLoading(false)
      }
    }
    fetchSubscription()
  }, [])

  // Freeプランや既に解約予定の場合はリダイレクト
  useEffect(() => {
    if (!loading && sub) {
      // Freeプランまたは既に解約予定の場合のみリダイレクト
      // has_stripe_subscriptionの条件は削除（有料プランなら解約フローを表示すべき）
      if (sub.plan_type === 'free' || sub.cancel_at) {
        router.replace('/account/billing')
      }
    }
  }, [loading, sub, router])

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <AppHeader />

        <main className="pt-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link
              href="/dashboard/settings?tab=plan"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
            >
              <ArrowLeft size={16} />
              設定（プラン）に戻る
            </Link>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <h1 className="text-2xl font-bold text-gray-900">サブスクリプションの解約</h1>

              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : sub && sub.plan_type !== 'free' && !sub.cancel_at ? (
                <CancelFlow
                  planType={sub.plan_type}
                  currentPeriodEnd={sub.current_period_end}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  解約対象のサブスクリプションがありません。
                </div>
              )}
            </m.div>
          </div>
        </main>
      </div>
    </LazyMotion>
  )
}
