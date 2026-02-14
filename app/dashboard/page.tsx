import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import DashboardClient from "@/components/DashboardClient"
import "./dashboard.css"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // プロファイルが完成しているかチェック
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, company_id, avatar_url")
    .eq("user_id", data.user.id)
    .single()

  // プロファイルが未完成の場合（nameが'User'またはcompany_idが存在しない）はプロファイル登録画面へ
  if (!profile || !profile.name || profile.name === "User" || !profile.company_id) {
    redirect("/auth/complete-profile")
  }

  // 会社情報とサブスクリプションを並列取得
  const [companyResult, subscriptionResult] = await Promise.all([
    supabase.from("companies").select("*").eq("id", profile.company_id).single(),
    supabase.from("subscriptions").select("*").eq("user_id", data.user.id).maybeSingle(),
  ])

  const company = companyResult.data
  const subscription = subscriptionResult.data

  return <DashboardClient profile={profile} company={company} subscription={subscription} />
}
