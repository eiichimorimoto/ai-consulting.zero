"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import {
  PlanMeta,
  PlanLimits,
  PLAN_CONFIG,
  getPlanFeatures,
  type PlanType,
} from "@/lib/plan-config"

interface Plan {
  name: string
  subtitle: string
  price: string
  unit: string
  features: string[]
  planType: "free" | "pro" | "enterprise"
  highlighted?: boolean
}

interface SettingsPlanProps {
  profile: any
  subscription: any
  planMeta: PlanMeta
  planLimits: PlanLimits
  sessionsThisMonth: number
  usedChats: number
  maxTurnsTotal: number | undefined
  remainingChats: number | null
  isChangingPlan: boolean
  handleChangePlan: (planType: string) => Promise<void>
}

export default function SettingsPlan({
  profile,
  subscription,
  planMeta,
  planLimits,
  sessionsThisMonth,
  usedChats,
  maxTurnsTotal,
  remainingChats,
  isChangingPlan,
  handleChangePlan,
}: SettingsPlanProps) {
  // プランカード表示用の料金プラン情報（PLAN_CONFIGから動的生成）
  const plans: Plan[] = (Object.keys(PLAN_CONFIG) as PlanType[]).map((planType) => {
    const config = PLAN_CONFIG[planType]
    const features = getPlanFeatures(planType)

    // 表示用の追加情報
    const displayInfo = {
      free: { subtitle: "まずAIコンサルを体験したい方へ", price: "0", unit: "円/月" },
      pro: {
        subtitle: "継続的にAIコンサルを業務に組み込みたい方へ",
        price: "35,000",
        unit: "円/月（年払い ¥30,000/月）",
        highlighted: true,
      },
      enterprise: {
        subtitle: "AIコンサルを組織に定着させたい企業向け",
        price: "120,000〜",
        unit: "円/月（要相談）",
      },
    }[planType]

    return {
      name: config.label,
      subtitle: displayInfo.subtitle,
      price: displayInfo.price,
      unit: displayInfo.unit,
      features,
      planType,
      highlighted: displayInfo.highlighted,
    }
  })

  return (
    <Card className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <CardHeader className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <CardTitle className="text-lg font-semibold text-gray-900">プラン管理</CardTitle>
        <CardDescription className="mt-1 text-gray-600">
          現在のプランと使用状況を確認できます
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-white pt-6">
        <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                現在のプラン: {planMeta.label}（{planMeta.priceLabel}）
              </h3>
              {subscription?.status && (
                <p className="mt-1 text-sm text-gray-600">
                  ステータス: {subscription.status === "active" ? "有効" : subscription.status}
                </p>
              )}
            </div>
            <div className="text-right">
              {subscription?.current_period_end && (
                <p className="text-sm text-gray-600">
                  次回更新日:{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-700">
              <span className="font-medium">今月の課題数:</span>{" "}
              {planLimits.isUnlimited || planLimits.maxSessions === null
                ? "制限なし"
                : `${sessionsThisMonth} / ${planLimits.maxSessions} 件`}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">今月のAI相談:</span>{" "}
              {planLimits.isUnlimited || maxTurnsTotal === null
                ? "制限なし"
                : `${usedChats} / ${maxTurnsTotal} 回`}
            </p>
            {!planLimits.isUnlimited && remainingChats !== null && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">残り相談可能回数:</span> 既存の課題であと{" "}
                {remainingChats} 回 AI に相談できます
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.planType}
              className={`${
                plan.highlighted
                  ? "border-2 border-blue-500 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl"
                  : "border border-gray-200 bg-white"
              }`}
            >
              <CardHeader>
                {plan.highlighted && (
                  <div className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs">
                    おすすめ
                  </div>
                )}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <CardTitle
                      className={`text-xl ${plan.highlighted ? "text-white" : "text-gray-900"}`}
                    >
                      {plan.name}
                    </CardTitle>
                    <CardDescription
                      className={plan.highlighted ? "text-white/80" : "text-gray-500"}
                    >
                      {plan.subtitle}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-3xl font-bold ${plan.highlighted ? "text-white" : "text-gray-900"}`}
                    >
                      {plan.price === "お問い合わせ" ? plan.price : `¥${plan.price}`}
                    </div>
                    <div
                      className={`text-sm ${plan.highlighted ? "text-white/80" : "text-gray-500"}`}
                    >
                      {plan.unit}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check
                        className={`h-4 w-4 ${plan.highlighted ? "text-white" : "text-blue-500"}`}
                      />
                      <span className={plan.highlighted ? "text-white/90" : "text-gray-600"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full font-bold ${
                    plan.highlighted
                      ? "bg-white text-blue-600 hover:bg-white/90"
                      : profile?.plan_type === plan.planType
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
                  }`}
                  onClick={() => handleChangePlan(plan.planType)}
                  disabled={profile?.plan_type === plan.planType || isChangingPlan}
                >
                  {profile?.plan_type === plan.planType ? "現在のプラン" : "プランを変更"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
