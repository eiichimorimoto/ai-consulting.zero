import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // プロファイルが完成しているかチェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, company_id')
    .eq('user_id', data.user.id)
    .single()

  // プロファイルが未完成の場合（nameが'User'またはcompany_idが存在しない）はプロファイル登録画面へ
  if (!profile || !profile.name || profile.name === 'User' || !profile.company_id) {
    redirect("/auth/complete-profile")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">SolveWise</span>
            </Link>
            <form action="/auth/logout" method="post">
              <Button variant="outline" type="submit">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ようこそ、{data.user.email}さん</h1>
          <p className="text-gray-600 mb-8">
            AIコンサルタントダッシュボードへようこそ。ここからAIとの対話を開始できます。
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">AIと相談する</h3>
              <p className="text-blue-100 text-sm mb-4">経営課題についてAIコンサルタントに相談しましょう</p>
              <Button variant="secondary" className="w-full">
                相談を始める
              </Button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">過去の相談</h3>
              <p className="text-gray-500 text-sm mb-4">これまでの相談履歴を確認できます</p>
              <Button variant="outline" className="w-full bg-transparent">
                履歴を見る
              </Button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">設定</h3>
              <p className="text-gray-500 text-sm mb-4">アカウントやプランの設定を変更できます</p>
              <Button variant="outline" className="w-full bg-transparent">
                設定を開く
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
