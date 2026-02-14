"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LazyMotion, domAnimation, m } from "framer-motion"
import { CheckCircle, Home, Loader2 } from "lucide-react"
import { Header } from "@/components/Header"
import { PLAN_CONFIG, getPlanFeatures, type PlanType } from "@/lib/plan-config"

export default function PricingPage() {
  const router = useRouter()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  async function handleCheckout(planType: string, interval: "monthly" | "yearly" = "monthly") {
    setCheckoutLoading(planType)
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType,
          interval,
          returnUrl: "/pricing", // /pricingページに戻る
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      if (res.status === 401) {
        // 未ログイン → サインアップへ
        router.push("/auth/sign-up")
        return
      }
      alert(data.error || "Checkout の生成に失敗しました")
    } catch {
      alert("エラーが発生しました")
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />

        <main className="pt-20">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            {/* Back to Top Button */}
            <Link
              href="/"
              className="group mb-8 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              <Home size={18} />
              <span>トップページに戻る</span>
            </Link>

            {/* Title */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-16 text-center"
            >
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  成長を加速させる
                </span>
                <br />
                AIコンサルプラン
              </h1>
              <p className="text-xl text-gray-600">
                まずは無料プランでお試しください。
                <br />
                AIコンサルを体験し、貴社の事業に永続的な価値をもたらす羅針盤として、共に未来を描きましょう。
              </p>
            </m.div>

            {/* Pricing Cards（アカウント設定のプラン内容と一致） */}
            <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {(Object.keys(PLAN_CONFIG) as PlanType[]).map((planType, index) => {
                const config = PLAN_CONFIG[planType]
                const features = getPlanFeatures(planType)

                // 表示用の追加情報
                const displayInfo = {
                  free: { price: "0", unit: "円/月", desc: "まずAIコンサルを体験したい方へ" },
                  pro: {
                    price: "35,000",
                    unit: "円/月（年払い ¥30,000/月）",
                    desc: "継続的にAIコンサルを業務に組み込みたい方へ",
                    featured: true,
                  },
                  enterprise: {
                    price: "120,000〜",
                    unit: "円/月（要相談）",
                    desc: "AIコンサルを組織に定着させたい企業向け",
                  },
                }[planType]

                return (
                  <m.div
                    key={config.label}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`relative rounded-2xl bg-white p-6 ${
                      displayInfo.featured
                        ? "border-2 border-blue-500 shadow-xl"
                        : "border border-gray-200"
                    }`}
                  >
                    {displayInfo.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
                        おすすめ
                      </div>
                    )}
                    <div className="mb-2 text-lg font-semibold">{config.label}</div>
                    <div className="mb-2 text-3xl font-bold text-gray-900">
                      {displayInfo.price === "お問い合わせ"
                        ? displayInfo.price
                        : `¥${displayInfo.price}`}
                      {displayInfo.unit ? (
                        <span className="text-base font-normal text-gray-500">
                          {" "}
                          {displayInfo.unit}
                        </span>
                      ) : (
                        displayInfo.price !== "お問い合わせ" && (
                          <span className="text-base font-normal text-gray-500">/月</span>
                        )
                      )}
                    </div>
                    <div className="mb-6 text-sm text-gray-500">{displayInfo.desc}</div>
                    <ul className="mb-6 space-y-3">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle size={16} className="text-green-500" /> {f}
                        </li>
                      ))}
                    </ul>
                    {planType === "enterprise" ? (
                      <Link
                        href="/contact"
                        className="inline-block w-full rounded-xl border border-gray-300 py-3 text-center font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        問い合わせる
                      </Link>
                    ) : planType === "free" ? (
                      <Link
                        href="/auth/sign-up"
                        className="inline-block w-full rounded-xl border border-gray-300 py-3 text-center font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        無料で登録
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleCheckout(planType)}
                        disabled={checkoutLoading === planType}
                        className={`inline-block w-full rounded-xl py-3 text-center font-medium transition-colors disabled:opacity-50 ${
                          displayInfo.featured
                            ? "btn-gradient text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {checkoutLoading === planType ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            読み込み中...
                          </span>
                        ) : (
                          "今すぐ始める"
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
