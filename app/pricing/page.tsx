'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { CheckCircle, Home, Loader2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { PLAN_CONFIG, getPlanFeatures, type PlanType } from '@/lib/plan-config'

export default function PricingPage() {
  const router = useRouter()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  async function handleCheckout(planType: string, interval: 'monthly' | 'yearly' = 'monthly') {
    setCheckoutLoading(planType)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planType, 
          interval,
          returnUrl: '/pricing'  // /pricingページに戻る
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      if (res.status === 401) {
        // 未ログイン → サインアップへ
        router.push('/auth/sign-up')
        return
      }
      alert(data.error || 'Checkout の生成に失敗しました')
    } catch {
      alert('エラーが発生しました')
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <LazyMotion features={domAnimation}>
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />

      <main className="pt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Back to Top Button */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-8"
          >
            <Home size={18} />
            <span>トップページに戻る</span>
          </Link>

          {/* Title */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                成長を加速させる
              </span>
              <br />
              AIコンサルプラン
            </h1>
            <p className="text-xl text-gray-600">
              まずは無料プランでお試しください。<br />
              AIコンサルを体験し、貴社の事業に永続的な価値をもたらす羅針盤として、共に未来を描きましょう。
            </p>
          </m.div>

          {/* Pricing Cards（アカウント設定のプラン内容と一致） */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {(Object.keys(PLAN_CONFIG) as PlanType[]).map((planType, index) => {
              const config = PLAN_CONFIG[planType]
              const features = getPlanFeatures(planType)
              
              // 表示用の追加情報
              const displayInfo = {
                free: { price: '0', unit: '円/月', desc: 'まずAIコンサルを体験したい方へ' },
                pro: { price: '35,000', unit: '円/月（年払い ¥30,000/月）', desc: '継続的にAIコンサルを業務に組み込みたい方へ', featured: true },
                enterprise: { price: '120,000〜', unit: '円/月（要相談）', desc: 'AIコンサルを組織に定着させたい企業向け' },
              }[planType]
              
              return (
              <m.div
                key={config.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`bg-white rounded-2xl p-6 relative ${
                  displayInfo.featured ? 'border-2 border-blue-500 shadow-xl' : 'border border-gray-200'
                }`}
              >
                {displayInfo.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    おすすめ
                  </div>
                )}
                <div className="text-lg font-semibold mb-2">{config.label}</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {displayInfo.price === 'お問い合わせ' ? displayInfo.price : `¥${displayInfo.price}`}
                  {displayInfo.unit ? <span className="text-base font-normal text-gray-500"> {displayInfo.unit}</span> : displayInfo.price !== 'お問い合わせ' && <span className="text-base font-normal text-gray-500">/月</span>}
                </div>
                <div className="text-sm text-gray-500 mb-6">{displayInfo.desc}</div>
                <ul className="space-y-3 mb-6">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle size={16} className="text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
                {planType === 'enterprise' ? (
                  <Link
                    href="/contact"
                    className="w-full py-3 rounded-xl font-medium transition-colors text-center inline-block border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    問い合わせる
                  </Link>
                ) : planType === 'free' ? (
                  <Link
                    href="/auth/sign-up"
                    className="w-full py-3 rounded-xl font-medium transition-colors text-center inline-block border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    無料で登録
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(planType)}
                    disabled={checkoutLoading === planType}
                    className={`w-full py-3 rounded-xl font-medium transition-colors text-center inline-block disabled:opacity-50 ${
                      displayInfo.featured
                        ? 'btn-gradient text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {checkoutLoading === planType ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        読み込み中...
                      </span>
                    ) : (
                      '今すぐ始める'
                    )}
                  </button>
                )}
              </m.div>
            )
            })}
          </div>
        </div>
      </main>
    </div>
    </LazyMotion>
  )
}
