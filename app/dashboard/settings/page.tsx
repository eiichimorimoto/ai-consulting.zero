import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import Image from "next/image"
import { Settings, ArrowLeft, Home } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import LogoutButton from "@/components/LogoutButton"
import SettingsContent from "@/components/SettingsContent"

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // プロファイル情報を取得（全フィールド）
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .single()

  // プロファイルが未完成の場合
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="w-full" style={{ paddingLeft: '19px', paddingRight: '19px' }}>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="h-6 w-6 text-gray-600" />
              </Link>
              <Link href="/dashboard" className="flex items-center gap-3">
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
            </div>
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
                    const cleanName = profile.name.replace(/\s+/g, '')
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
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">設定</h1>
            </div>
            <p className="text-gray-600 ml-16">アカウント、プラン、請求情報を管理できます</p>
          </div>

          <SettingsContent 
            user={data.user}
            profile={profile}
            company={company}
            subscription={subscription}
          />
        </div>
      </main>
    </div>
  )
}


