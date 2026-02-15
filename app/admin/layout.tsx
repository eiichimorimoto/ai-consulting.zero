import type React from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from "@/lib/admin/check"
import AdminNav from "@/components/admin/AdminNav"
import AdminHeader from "@/components/admin/AdminHeader"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Admin - SolveWise",
  description: "SolveWise 管理コンソール",
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // 1. 認証チェック
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // 2. 管理者チェック（async: DBベース）
  if (!(await checkAdminAccess(user.id))) {
    redirect("/dashboard")
  }

  // 3. プロファイル取得（表示用）
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("user_id", user.id)
    .single()

  const adminName = profile?.name || "Admin"
  const adminEmail = profile?.email || user.email || ""

  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950">
      {/* サイドバー */}
      <AdminNav />

      {/* メインコンテンツ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader adminName={adminName} adminEmail={adminEmail} />

        <main className="flex-1 overflow-auto bg-zinc-50/50 p-4 dark:bg-zinc-950 sm:p-6">
          {children}
        </main>
      </div>

      <Toaster />
      <SonnerToaster position="top-right" expand richColors closeButton />
    </div>
  )
}
