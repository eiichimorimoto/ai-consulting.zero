/**
 * 管理API: システムヘルスチェック（拡張版）
 *
 * GET /api/admin/system/health
 *
 * 既存の health-monitor.ts を拡張し、外部サービスの疎通チェックを追加。
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/check"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyRateLimit } from "@/lib/rate-limit"
import type { SystemHealthItem } from "@/types/admin"

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAdmin()
  if (authError) return authError

  const rateLimitError = applyRateLimit(request, "adminRead", user.id)
  if (rateLimitError) return rateLimitError

  const checks: SystemHealthItem[] = []

  // 1. Supabase接続チェック
  try {
    const start = Date.now()
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.from("profiles").select("id", { head: true, count: "exact" })
    const elapsed = Date.now() - start

    checks.push({
      service: "Supabase Database",
      status: error ? "error" : elapsed > 2000 ? "warning" : "healthy",
      responseTimeMs: elapsed,
      message: error ? `接続エラー: ${error.message}` : `応答時間: ${elapsed}ms`,
      lastChecked: new Date().toISOString(),
    })
  } catch (err) {
    checks.push({
      service: "Supabase Database",
      status: "error",
      message: `接続失敗: ${err instanceof Error ? err.message : "Unknown"}`,
      lastChecked: new Date().toISOString(),
    })
  }

  // 2. Stripe API チェック
  try {
    const start = Date.now()
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    })
    const elapsed = Date.now() - start

    checks.push({
      service: "Stripe API",
      status: res.ok ? (elapsed > 2000 ? "warning" : "healthy") : "error",
      responseTimeMs: elapsed,
      message: res.ok ? `応答時間: ${elapsed}ms` : `HTTP ${res.status}`,
      lastChecked: new Date().toISOString(),
    })
  } catch (err) {
    checks.push({
      service: "Stripe API",
      status: "error",
      message: `接続失敗: ${err instanceof Error ? err.message : "Unknown"}`,
      lastChecked: new Date().toISOString(),
    })
  }

  // 3. Anthropic API チェック
  try {
    const start = Date.now()
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    })
    const elapsed = Date.now() - start

    // 200 or 400 = APIは稼働中（400はトークン制限等）
    const isUp = res.status === 200 || res.status === 400
    checks.push({
      service: "Anthropic Claude API",
      status: isUp ? (elapsed > 5000 ? "warning" : "healthy") : "error",
      responseTimeMs: elapsed,
      message: isUp ? `応答時間: ${elapsed}ms` : `HTTP ${res.status}`,
      lastChecked: new Date().toISOString(),
    })
  } catch (err) {
    checks.push({
      service: "Anthropic Claude API",
      status: "error",
      message: `接続失敗: ${err instanceof Error ? err.message : "Unknown"}`,
      lastChecked: new Date().toISOString(),
    })
  }

  // 4. Slack Webhook チェック
  const slackUrl = process.env.SLACK_WEBHOOK_URL
  if (slackUrl) {
    checks.push({
      service: "Slack Webhook",
      status: "healthy",
      message: "Webhook URL設定済み",
      lastChecked: new Date().toISOString(),
    })
  } else {
    checks.push({
      service: "Slack Webhook",
      status: "warning",
      message: "SLACK_WEBHOOK_URL 未設定",
      lastChecked: new Date().toISOString(),
    })
  }

  // 5. 環境変数チェック
  const requiredEnvs = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "ANTHROPIC_API_KEY",
    "RESEND_API_KEY",
    "ADMIN_USER_IDS",
  ]

  const missingEnvs = requiredEnvs.filter((key) => !process.env[key])
  checks.push({
    service: "環境変数",
    status: missingEnvs.length === 0 ? "healthy" : "warning",
    message:
      missingEnvs.length === 0
        ? `${requiredEnvs.length}件すべて設定済み`
        : `未設定: ${missingEnvs.join(", ")}`,
    lastChecked: new Date().toISOString(),
  })

  // 全体ステータス
  const hasError = checks.some((c) => c.status === "error")
  const hasWarning = checks.some((c) => c.status === "warning")
  const overall = hasError ? "error" : hasWarning ? "warning" : "healthy"

  return NextResponse.json({
    overall,
    checks,
    timestamp: new Date().toISOString(),
  })
}
