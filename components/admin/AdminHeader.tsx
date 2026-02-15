"use client"

import { Bell, LogOut, Sun, Moon, Monitor } from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface AdminHeaderProps {
  adminName: string
  adminEmail: string
}

export default function AdminHeader({ adminName, adminEmail }: AdminHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }

  const themeIcon = !mounted ? (
    <Monitor className="h-4 w-4" />
  ) : theme === "dark" ? (
    <Moon className="h-4 w-4" />
  ) : theme === "light" ? (
    <Sun className="h-4 w-4" />
  ) : (
    <Monitor className="h-4 w-4" />
  )

  const themeLabel = !mounted
    ? "テーマ"
    : theme === "dark"
      ? "ダーク"
      : theme === "light"
        ? "ライト"
        : "システム"

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          管理コンソール
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* テーマ切替 */}
        <button
          onClick={cycleTheme}
          className="flex items-center gap-1.5 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title={`テーマ: ${themeLabel}`}
        >
          {themeIcon}
          <span className="hidden text-xs sm:inline">{themeLabel}</span>
        </button>

        {/* 通知ベル */}
        <button
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="通知"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* 管理者情報 */}
        <div className="flex items-center gap-2 border-l border-zinc-200 pl-2 dark:border-zinc-700 sm:gap-3 sm:pl-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{adminName}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{adminEmail}</p>
          </div>
          <Link
            href="/auth/logout"
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
            title="ログアウト"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}
