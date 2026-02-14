/**
 * 課金管理ページ（メイン）
 *
 * サブスクリプション状態表示、ポータルへの導線、解約への導線を提供。
 *
 * @see stripe-payment-spec-v2.2.md §8-1
 */
'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { ArrowLeft, ExternalLink, FileText, XCircle, CreditCard, RefreshCw } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { SubscriptionStatus } from '@/components/billing/SubscriptionStatus'
import { PaymentFailureBanner } from '@/components/billing/PaymentFailureBanner'

interface SubscriptionData {
  plan_type: string
  status: string
  app_status: string
  billing_interval: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at: string | null
  canceled_at: string | null
  trial_end: string | null
  has_stripe_subscription: boolean
}

function BillingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sub, setSub] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  const reason = searchParams.get('reason')

  useEffect(() => {
    fetchSubscription()
  }, [])

  async function fetchSubscription() {
    try {
      const res = await fetch('/api/stripe/subscription')
      if (res.ok) {
        const data = await res.json()
        setSub(data.subscription)
      }
    } catch {
      // エラー時はnullのまま
    } finally {
      setLoading(false)
    }
  }

  async function openPortal() {
    setPortalLoading(true)
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
      setPortalLoading(false)
    }
  }

  async function handleRetryPayment() {
    try {
      const res = await fetch('/api/stripe/retry-payment', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert('再請求を実行しました。')
        fetchSubscription()
      } else {
        alert(data.error || '再請求に失敗しました。')
      }
    } catch {
      alert('エラーが発生しました。')
    }
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <AppHeader />

        <main className="pt-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <h1 className="text-2xl font-bold text-gray-900">課金管理</h1>

              {/* サービス停止バナー */}
              {reason === 'suspended' && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  ⚠️ お支払いが確認できなかったため、サービスが一時停止されています。
                  お支払い方法を更新してください。
                </div>
              )}

              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : sub ? (
                <>
                  {/* 未払い警告 */}
                  <PaymentFailureBanner
                    status={sub.status}
                    appStatus={sub.app_status}
                  />

                  {/* プラン状態 */}
                  <SubscriptionStatus
                    planType={sub.plan_type as 'free' | 'pro' | 'enterprise'}
                    status={sub.status}
                    appStatus={sub.app_status}
                    billingInterval={sub.billing_interval}
                    currentPeriodEnd={sub.current_period_end}
                    cancelAt={sub.cancel_at}
                    trialEnd={sub.trial_end}
                  />

                  {/* アクションボタン */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sub.has_stripe_subscription && (
                      <button
                        onClick={openPortal}
                        disabled={portalLoading}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <ExternalLink size={16} />
                        {portalLoading ? '読み込み中...' : 'Stripe管理画面を開く'}
                      </button>
                    )}

                    <Link
                      href="/account/billing/invoices"
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      <FileText size={16} />
                      請求書一覧
                    </Link>

                    {sub.plan_type !== 'free' && !sub.cancel_at && (
                      <Link
                        href="/account/cancel"
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-white text-red-600 font-medium hover:bg-red-50 transition-colors"
                      >
                        <XCircle size={16} />
                        解約する
                      </Link>
                    )}

                    {sub.plan_type === 'free' && (
                      <Link
                        href="/pricing"
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                      >
                        <CreditCard size={16} />
                        プランをアップグレード
                      </Link>
                    )}

                    {sub.status === 'past_due' && (
                      <button
                        onClick={handleRetryPayment}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-yellow-500 text-white font-medium hover:bg-yellow-600 transition-colors"
                      >
                        <RefreshCw size={16} />
                        再請求を実行
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  サブスクリプション情報の取得に失敗しました。
                </div>
              )}
            </m.div>
          </div>
        </main>
      </div>
    </LazyMotion>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <AppHeader />
        <main className="pt-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}
