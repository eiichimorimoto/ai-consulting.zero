/**
 * PlanGate コンポーネント
 *
 * プラン判定 + app_status=suspended判定を行い、
 * 権限不足時にはアップグレード誘導やサービス停止メッセージを表示する。
 *
 * @see stripe-payment-spec-v2.2.md §8-2
 */
"use client"

import React from "react"
import Link from "next/link"
import { AlertTriangle, Lock, CreditCard } from "lucide-react"
import type { PlanType } from "@/lib/plan-config"

interface PlanGateProps {
  /** 現在のユーザーのプラン */
  currentPlan: PlanType
  /** このコンテンツに必要なプラン */
  requiredPlan: PlanType
  /** 現在のapp_status */
  appStatus?: string
  /** 権限がある場合に表示する子要素 */
  children: React.ReactNode
  /** アップグレード誘導メッセージ（カスタム） */
  upgradeMessage?: string
}

const PLAN_LABELS: Record<PlanType, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
}

const PLAN_LEVEL: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

export function PlanGate({
  currentPlan,
  requiredPlan,
  appStatus = "active",
  children,
  upgradeMessage,
}: PlanGateProps) {
  // サービス停止中（§8-2）
  if (appStatus === "suspended") {
    return (
      <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="text-lg font-bold text-red-800">サービスが一時停止されています</h3>
        <p className="text-sm text-red-700">
          お支払いが確認できなかったため、サービスを一時停止しております。
          <br />
          お支払い方法を更新していただくと、サービスが復旧されます。
        </p>
        <Link
          href="/account/billing?reason=suspended"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-red-700"
        >
          <CreditCard size={16} />
          お支払い情報を更新する
        </Link>
      </div>
    )
  }

  // プラン不足
  if (PLAN_LEVEL[currentPlan] < PLAN_LEVEL[requiredPlan]) {
    return (
      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
        <Lock className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="text-lg font-bold text-gray-800">
          {PLAN_LABELS[requiredPlan]}プラン以上が必要です
        </h3>
        <p className="text-sm text-gray-600">
          {upgradeMessage ||
            `この機能は${PLAN_LABELS[requiredPlan]}プラン以上でご利用いただけます。`}
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
        >
          プランをアップグレード
        </Link>
      </div>
    )
  }

  // 権限あり
  return <>{children}</>
}
