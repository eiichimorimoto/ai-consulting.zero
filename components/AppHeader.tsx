"use client"

import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { LogOut, ArrowLeft, User } from "lucide-react"
import { useEffect, useState } from "react"

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
  const isDashboardMain = pathname === "/dashboard"

  // プロフィール情報を取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!supabase) return
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("user_id", user.id)
          .single()
        if (data) {
          setProfile(data)
        }
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    // 確認メッセージを表示
    const confirmed = window.confirm("ログアウトしてもよろしいですか？")
    if (!confirmed) return

    if (!supabase) return
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleBack = () => {
    // ダッシュボードに戻る（フォワードしてきた元の画面）
    router.push("/dashboard")
  }

  // ユーザーイニシャルを取得
  const getUserInitials = () => {
    if (!profile?.name) return "U"
    const cleanName = profile.name.replace(/\s+/g, "")
    return cleanName.length >= 2 ? cleanName.slice(0, 2) : cleanName.slice(0, 1)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 shadow-sm backdrop-blur-2xl">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* 左側: 戻るボタン + ロゴ */}
          <div className="flex items-center gap-4">
            {/* 戻るボタン（ダッシュボードメイン以外で表示） */}
            {!isDashboardMain && (
              <button
                onClick={handleBack}
                className="flex min-w-[48px] cursor-pointer flex-col items-center gap-0.5 text-gray-600 transition-colors hover:text-blue-600"
              >
                <ArrowLeft size={20} />
                <span className="text-[10px] font-medium">Back</span>
              </button>
            )}

            {/* ロゴ（クリックでダッシュボードへ・キャッシュバスティングでVercel反映を確実に） */}
            <Link href="/dashboard" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="SolveWise"
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <div>
                <span className="text-lg font-bold text-gray-900">SolveWise</span>
                <p className="hidden text-xs text-gray-600 sm:block">経営課題をAIで解決</p>
              </div>
            </Link>
          </div>

          {/* 右側: ユーザーアイコン + ログアウトボタン */}
          <div className="flex items-center gap-4">
            {/* ユーザーアイコン（設定ページへリンク） */}
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.name || "User"}
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-white">{getUserInitials()}</span>
                )}
              </div>
              {profile?.name && (
                <span className="hidden max-w-[100px] truncate text-sm font-medium text-gray-700 sm:block">
                  {profile.name}
                </span>
              )}
            </Link>

            {/* ログアウトボタン */}
            <button
              onClick={handleLogout}
              className="flex min-w-[48px] cursor-pointer flex-col items-center gap-0.5 text-gray-600 transition-colors hover:text-red-600"
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
