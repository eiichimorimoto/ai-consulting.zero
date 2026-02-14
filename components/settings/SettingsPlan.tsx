'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { PlanMeta, PlanLimits } from '@/lib/plan-config'

interface Plan {
  name: string
  subtitle: string
  price: string
  unit: string
  features: string[]
  planType: 'free' | 'pro' | 'enterprise'
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
  // プランカード表示用の料金プラン情報
  const plans: Plan[] = [
    {
      name: 'Free',
      subtitle: 'まずAIコンサルを体験したい方へ',
      price: '0',
      unit: '円/月',
      features: [
        '月5セッション（1セッション15往復）',
        '全カテゴリ診断OK',
        '簡易サマリーのみ（最終レポートなし）',
        'クレジット登録不要',
      ],
      planType: 'free' as const,
    },
    {
      name: 'Pro',
      subtitle: '継続的にAIコンサルを業務に組み込みたい方へ',
      price: '35,000',
      unit: '円/月（年払い ¥30,000/月）',
      features: [
        '月30セッション（1セッション30往復）',
        '最終レポート出力',
        '実行計画書の作成',
        '過去相談の履歴・分析ダッシュボード',
        '新機能の優先利用権',
        'クレジット支払対応',
      ],
      planType: 'pro' as const,
      highlighted: true,
    },
    {
      name: 'Enterprise',
      subtitle: 'AIコンサルを組織に定着させたい企業向け',
      price: '120,000〜',
      unit: '円/月（要相談）',
      features: [
        '無制限セッション',
        '実行計画支援（進捗管理付き）',
        '実際のコンサルタント紹介・連携',
        '全新機能の最速アクセス',
        'カスタム診断テンプレート',
        '専任サポート・オンボーディング',
        'クレジット・請求書払い対応',
      ],
      planType: 'enterprise' as const,
    },
  ]

  return (
    <Card className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <CardTitle className="text-lg font-semibold text-gray-900">プラン管理</CardTitle>
        <CardDescription className="text-gray-600 mt-1">現在のプランと使用状況を確認できます</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 bg-white">
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                現在のプラン: {planMeta.label}（{planMeta.priceLabel}）
              </h3>
              {subscription?.status && (
                <p className="text-sm text-gray-600 mt-1">
                  ステータス: {subscription.status === 'active' ? '有効' : subscription.status}
                </p>
              )}
            </div>
            <div className="text-right">
              {subscription?.current_period_end && (
                <p className="text-sm text-gray-600">
                  次回更新日: {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-medium">今月の課題数:</span>{' '}
              {planLimits.isUnlimited || planLimits.maxSessions == null
                ? '制限なし'
                : `${sessionsThisMonth} / ${planLimits.maxSessions} 件`}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">今月のAI相談:</span>{' '}
              {planLimits.isUnlimited || maxTurnsTotal == null
                ? '制限なし'
                : `${usedChats} / ${maxTurnsTotal} 回`}
            </p>
            {!planLimits.isUnlimited && remainingChats != null && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">残り相談可能回数:</span>{' '}
                既存の課題であと {remainingChats} 回 AI に相談できます
              </p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.planType}
              className={`${
                plan.highlighted
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-2 border-blue-500 shadow-xl'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <CardHeader>
                {plan.highlighted && (
                  <div className="text-xs bg-white/20 rounded-full px-3 py-1 inline-block mb-3">おすすめ</div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <CardTitle className={`text-xl ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription className={plan.highlighted ? 'text-white/80' : 'text-gray-500'}>
                      {plan.subtitle}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price === 'お問い合わせ' ? plan.price : `¥${plan.price}`}
                    </div>
                    <div className={`text-sm ${plan.highlighted ? 'text-white/80' : 'text-gray-500'}`}>
                      {plan.unit}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className={`w-4 h-4 ${plan.highlighted ? 'text-white' : 'text-blue-500'}`} />
                      <span className={plan.highlighted ? 'text-white/90' : 'text-gray-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full font-bold ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-white/90'
                      : profile?.plan_type === plan.planType
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                  }`}
                  onClick={() => handleChangePlan(plan.planType)}
                  disabled={profile?.plan_type === plan.planType || isChangingPlan}
                >
                  {profile?.plan_type === plan.planType ? '現在のプラン' : 'プランを変更'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
