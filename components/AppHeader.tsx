'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut, ArrowLeft, User } from 'lucide-react'
import { useEffect, useState } from 'react'

interface UserProfile {
  name: string
  avatar_url: string | null
}

export default function AppHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // ダッシュボードページかどうか
  const isDashboardMain = pathname === '/dashboard'

  // プロフィール情報を取得
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('user_id', user.id)
          .single()
        if (data) {
          setProfile(data)
        }
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleBack = () => {
    // ダッシュボードに戻る
    router.push('/dashboard')
  }

  // ユーザーイニシャルを取得
  const getUserInitials = () => {
    if (!profile?.name) return 'U'
    const cleanName = profile.name.replace(/\s+/g, '')
    return cleanName.length >= 2 ? cleanName.slice(0, 2) : cleanName.slice(0, 1)
  }

  return (
    <header className="bg-white/70 backdrop-blur-2xl shadow-sm border-b border-white/20 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 左側: 戻るボタン + ロゴ */}
          <div className="flex items-center gap-4">
            {/* 戻るボタン（ダッシュボードメイン以外で表示） */}
            {!isDashboardMain && (
              <button
                onClick={handleBack}
                className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer min-w-[48px]"
              >
                <ArrowLeft size={20} />
                <span className="text-[10px] font-medium">Back</span>
              </button>
            )}
            
            {/* ロゴ（クリックでダッシュボードへ） */}
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

          {/* 右側: ユーザーアイコン + ログアウトボタン */}
          <div className="flex items-center gap-4">
            {/* ユーザーアイコン（設定ページへリンク） */}
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.name || 'User'}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {getUserInitials()}
                  </span>
                )}
              </div>
              {profile?.name && (
                <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[100px] truncate">
                  {profile.name}
                </span>
              )}
            </Link>

            {/* ログアウトボタン */}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-red-600 transition-colors cursor-pointer min-w-[48px]"
            >
              <LogOut size={20} />
              <span className="text-[10px] font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
