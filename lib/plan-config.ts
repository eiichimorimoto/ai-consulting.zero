export type PlanType = "free" | "pro" | "enterprise"

export interface PlanLimits {
  maxSessions?: number
  maxTurnsPerSession?: number
  maxTurnsTotal?: number
  isUnlimited?: boolean
}

export interface PlanMeta extends PlanLimits {
  id: PlanType
  label: string
  priceLabel: string
  description: string
  features: string[]
}

export const PLAN_CONFIG: Record<PlanType, PlanMeta> = {
  free: {
    id: "free",
    label: "Free",
    priceLabel: "¥0",
    description: "まずAIコンサルを体験するための無料プラン",
    maxSessions: 3,
    maxTurnsPerSession: 15,
    maxTurnsTotal: 3 * 15,
    isUnlimited: false,
    features: [
      "__SESSIONS__", // 動的生成：月Xセッション（1セッションY往復）
      "全カテゴリ診断OK",
      "簡易サマリーのみ（最終レポートなし）",
      "クレジット登録不要",
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceLabel: "¥35,000/月（年払い ¥30,000/月）",
    description: "継続的にAIコンサルを業務に組み込むための実務向けプラン",
    maxSessions: 30,
    maxTurnsPerSession: 30,
    maxTurnsTotal: 30 * 30,
    isUnlimited: false,
    features: [
      "__SESSIONS__", // 動的生成：月Xセッション（1セッションY往復）
      "最終レポート出力",
      "実行計画書の作成",
      "過去相談の履歴・分析ダッシュボード",
      "新機能の優先利用権",
      "クレジット支払対応",
    ],
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    priceLabel: "¥120,000〜/月（要相談）",
    description: "AIコンサルを組織全体に定着させるための企業向けプラン",
    isUnlimited: true,
    features: [
      "無制限セッション",
      "実行計画支援（進捗管理付き）",
      "実際のコンサルタント紹介・連携",
      "全新機能の最速アクセス",
      "カスタム診断テンプレート",
      "専任サポート・オンボーディング",
      "クレジット・請求書払い対応",
    ],
  },
}

export function getPlanMeta(planType: string | null | undefined): PlanMeta {
  if (!planType) return PLAN_CONFIG.free
  const key = planType as PlanType
  return PLAN_CONFIG[key] ?? PLAN_CONFIG.free
}

export function getPlanLimits(planType: string | null | undefined): PlanLimits {
  const meta = getPlanMeta(planType)
  const { maxSessions, maxTurnsPerSession, maxTurnsTotal, isUnlimited } = meta
  return { maxSessions, maxTurnsPerSession, maxTurnsTotal, isUnlimited }
}

/**
 * プランの機能リストを取得（セッション数などを動的生成）
 *
 * @param planType - プラン種別
 * @returns 機能説明の配列
 */
export function getPlanFeatures(planType: PlanType): string[] {
  const config = PLAN_CONFIG[planType]

  return config.features.map((feature) => {
    // '__SESSIONS__' プレースホルダーを動的に生成
    if (feature === "__SESSIONS__") {
      if (config.isUnlimited) {
        return "無制限セッション"
      }
      return `月${config.maxSessions}セッション（1セッション${config.maxTurnsPerSession}往復）`
    }
    return feature
  })
}
