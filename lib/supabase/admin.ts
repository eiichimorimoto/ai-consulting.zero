/**
 * Supabase Admin Client（service_role）
 *
 * Webhook処理など、RLSをバイパスする必要がある操作に使用する。
 * service_roleキーは全テーブルへのフルアクセス権を持つため、
 * サーバーサイド（API Routes / Server Actions）でのみ使用すること。
 *
 * ⚠️ NEXT_PUBLIC_ プレフィックスを付けないこと（クライアントに露出する）
 *
 * @see stripe-payment-spec-v2.2.md §4-4（Webhook冪等性）
 */
import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Admin環境変数が設定されていません")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
