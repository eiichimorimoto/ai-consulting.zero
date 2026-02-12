'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { CheckCircle, Home } from 'lucide-react'
import { Header } from '@/components/Header'

export default function PricingPage() {
  const router = useRouter()

  const handleSignup = () => {
    router.push('/auth/sign-up')
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
            {[
              { name: 'Free', price: '0', unit: '円/月', desc: 'まずAIコンサルを体験したい方へ', features: ['月5セッション（1セッション15往復）', '全カテゴリ診断OK', '簡易サマリーのみ（最終レポートなし）', 'クレジット登録不要'] },
              { name: 'Pro', price: '35,000', unit: '円/月（年払い ¥30,000/月）', desc: '継続的にAIコンサルを業務に組み込みたい方へ', featured: true, features: ['月30セッション（1セッション30往復）', '最終レポート出力', '実行計画書の作成', '過去相談の履歴・分析ダッシュボード', '新機能の優先利用権', 'クレジット支払対応'] },
              { name: 'Enterprise', price: '120,000〜', unit: '円/月（要相談）', desc: 'AIコンサルを組織に定着させたい企業向け', features: ['無制限セッション', '実行計画支援（進捗管理付き）', '実際のコンサルタント紹介・連携', '全新機能の最速アクセス', 'カスタム診断テンプレート', '専任サポート・オンボーディング', 'クレジット・請求書払い対応'] }
            ].map((plan, index) => (
              <m.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`bg-white rounded-2xl p-6 relative ${
                  plan.featured ? 'border-2 border-blue-500 shadow-xl' : 'border border-gray-200'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    おすすめ
                  </div>
                )}
                <div className="text-lg font-semibold mb-2">{plan.name}</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {plan.price === 'お問い合わせ' ? plan.price : `¥${plan.price}`}
                  {plan.unit ? <span className="text-base font-normal text-gray-500"> {plan.unit}</span> : plan.price !== 'お問い合わせ' && <span className="text-base font-normal text-gray-500">/月</span>}
                </div>
                <div className="text-sm text-gray-500 mb-6">{plan.desc}</div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle size={16} className="text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
                {plan.name === 'Enterprise' ? (
                  <Link
                    href="/contact"
                    className={`w-full py-3 rounded-xl font-medium transition-colors text-center inline-block ${
                      plan.featured 
                        ? 'btn-gradient text-white' 
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    問い合わせる
                  </Link>
                ) : (
                  <Link
                    href="/auth/sign-up"
                    className={`w-full py-3 rounded-xl font-medium transition-colors text-center inline-block ${
                      plan.featured 
                        ? 'btn-gradient text-white' 
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    無料で登録
                  </Link>
                )}
              </m.div>
            ))}
          </div>
        </div>
      </main>
    </div>
    </LazyMotion>
  )
}

