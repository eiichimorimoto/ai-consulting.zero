"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  BarChart3,
  Database,
  Shield,
  Settings,
  Menu,
  X,
} from "lucide-react"

const NAV_ITEMS = [
  { label: "ダッシュボード", href: "/admin", icon: LayoutDashboard },
  { label: "ユーザー管理", href: "/admin/users", icon: Users },
  { label: "課金管理", href: "/admin/billing", icon: CreditCard },
  { label: "システム監視", href: "/admin/system", icon: Activity },
  { label: "分析・KPI", href: "/admin/analytics", icon: BarChart3 },
  { label: "データ管理", href: "/admin/content", icon: Database },
  { label: "設定", href: "/admin/settings", icon: Settings },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <>
      {/* ロゴ */}
      <div className="border-b border-zinc-200 px-4 py-5 dark:border-zinc-700">
        <Link href="/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            SolveWise Admin
          </span>
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                transition-colors duration-150
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                }
              `}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* フッター */}
      <div className="border-t border-zinc-200 px-3 py-4 dark:border-zinc-700">
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>ユーザー画面へ</span>
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* モバイル: ハンバーガーボタン */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 rounded-lg bg-white p-2 shadow-md dark:bg-zinc-800 lg:hidden"
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
      </button>

      {/* モバイル: オーバーレイ + ドロワー */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-zinc-50 shadow-xl dark:bg-zinc-900">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="メニューを閉じる"
            >
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* デスクトップ: 固定サイドバー */}
      <aside className="hidden w-60 min-h-screen flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 lg:flex">
        {navContent}
      </aside>
    </>
  )
}
