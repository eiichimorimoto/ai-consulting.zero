import { createBrowserClient } from "@supabase/ssr"

// NOTE:
// このプロジェクトではSupabaseのDatabase型（generated types）がまだ未導入のため、
// 型が `never` になって `.from('table')` 等が全てエラー化するのを防ぐため any を明示する。
let client: ReturnType<typeof createBrowserClient<any>> | null = null

export function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  if (client) return client

  client = createBrowserClient<any>(supabaseUrl, supabaseAnonKey)
  return client
}
