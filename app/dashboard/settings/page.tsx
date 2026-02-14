import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Settings } from "lucide-react"
import SettingsContent from "@/components/SettingsContent"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const initialTab = params.tab || "account"
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // プロファイル情報を取得（全フィールド）
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .single()

  // 会社情報を取得（プロファイルにcompany_idがある場合のみ）
  const { data: company } = profile?.company_id
    ? await supabase.from("companies").select("*").eq("id", profile.company_id).single()
    : { data: null }

  // サブスクリプション情報を取得
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle()

  // 今月の相談セッション数（課題数）を集計
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))

  const { count: monthlySessionCount } = await supabase
    .from("consulting_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.user.id)
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString())

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダーはConditionalHeaderで表示 */}

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-8 shadow-md">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-purple-100">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">設定</h1>
            </div>
            <p className="ml-16 text-gray-600">アカウント、プラン、請求情報を管理できます</p>
          </div>

          <SettingsContent
            user={data.user}
            profile={profile}
            company={company}
            subscription={subscription}
            monthlySessionCount={monthlySessionCount ?? 0}
            initialTab={initialTab}
          />
        </div>
      </main>
    </div>
  )
}
