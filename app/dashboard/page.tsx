import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import DashboardClient from "@/components/DashboardClient"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // プロファイルが完成しているかチェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, company_id, avatar_url')
    .eq('user_id', data.user.id)
    .single()

  // プロファイルが未完成の場合（nameが'User'またはcompany_idが存在しない）はプロファイル登録画面へ
  if (!profile || !profile.name || profile.name === 'User' || !profile.company_id) {
    redirect("/auth/complete-profile")
  }

  // 会社情報を取得
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .single()

  // サブスクリプション情報を取得
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', data.user.id)
    .maybeSingle()

  return <DashboardClient profile={profile} company={company} subscription={subscription} />
}
