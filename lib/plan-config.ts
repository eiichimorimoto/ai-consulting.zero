export type PlanType = 'free' | 'pro' | 'enterprise'

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
}

export const PLAN_CONFIG: Record<PlanType, PlanMeta> = {
  free: {
    id: 'free',
    label: 'Free',
    priceLabel: '¥0',
    description: 'まずAIコンサルを体験するための無料プラン',
    maxSessions: 5,
    maxTurnsPerSession: 15,
    maxTurnsTotal: 5 * 15,
    isUnlimited: false,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    priceLabel: '¥35,000/月（年払い ¥30,000/月）',
    description: '継続的にAIコンサルを業務に組み込むための実務向けプラン',
    maxSessions: 30,
    maxTurnsPerSession: 30,
    maxTurnsTotal: 30 * 30,
    isUnlimited: false,
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    priceLabel: '¥120,000〜/月（要相談）',
    description: 'AIコンサルを組織全体に定着させるための企業向けプラン',
    isUnlimited: true,
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

