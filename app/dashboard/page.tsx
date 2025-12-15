import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MessageSquare, History, Settings, Home } from "lucide-react"
import Image from "next/image"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import LogoutButton from "@/components/LogoutButton"

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white/70 backdrop-blur-2xl shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="w-full" style={{ paddingLeft: '19px', paddingRight: '19px' }}>
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/info-data/AI-LOGO001.png"
                alt="SolveWise"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <div>
                <span className="text-lg font-bold text-gray-900">
                  SolveWise
                </span>
                <p className="text-xs hidden sm:block text-gray-600">
                  経営課題をAIで解決
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-6">
              <Link 
                href="/" 
                className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Home size={18} />
                <span className="text-xs">TOP</span>
              </Link>
              
              {/* アバター表示 */}
              <Avatar className="w-10 h-10">
                {profile.avatar_url ? (
                  <AvatarImage 
                    src={profile.avatar_url} 
                    alt={profile.name || 'User'}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                  {(() => {
                    if (!profile.name) return 'U'
                    // スペースや空白を除去
                    const cleanName = profile.name.replace(/\s+/g, '')
                    // 最初の2文字を取得（漢字2文字）
                    return cleanName.length >= 2 ? cleanName.slice(0, 2) : cleanName.slice(0, 1)
                  })()}
                </AvatarFallback>
              </Avatar>
              
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ようこそ、{profile.name}さん</h1>
          <p className="text-gray-600 mb-8">
            AIコンサルタントダッシュボードへようこそ。ここからAIとの対話を開始できます。
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold">AIと相談する</h3>
              </div>
              <p className="text-blue-100 text-sm mb-4">経営課題をAIに相談</p>
              <Button variant="secondary" className="w-full bg-white text-blue-600 hover:bg-blue-50">
                相談を始める
              </Button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <History className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">過去の相談</h3>
              </div>
              <p className="text-gray-500 text-sm mb-4">これまでの相談履歴を確認できます</p>
              <Button className="w-full bg-orange-500 text-white hover:bg-orange-600">
                履歴を見る
              </Button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">設定</h3>
              </div>
              <p className="text-gray-500 text-sm mb-4">アカウントやプランの設定を変更できます</p>
              <Link href="/dashboard/settings">
                <Button className="w-full bg-purple-500 text-white hover:bg-purple-600">
                  設定を開く
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
