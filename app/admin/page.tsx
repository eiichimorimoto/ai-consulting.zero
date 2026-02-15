import { createAdminClient } from "@/lib/supabase/admin"
import {
  Users,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  UserPlus,
  XCircle,
} from "lucide-react"
import Link from "next/link"

export default async function AdminDashboardPage() {
  const supabaseAdmin = createAdminClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // 並列でKPIデータを取得
  const [
    totalUsersResult,
    newUsersTodayResult,
    activeSubsResult,
    paymentFailuresResult,
    sessionsResult,
    recentSignupsResult,
    recentFailuresResult,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    supabaseAdmin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("plan_type", ["pro", "enterprise"])
      .eq("status", "active"),
    supabaseAdmin
      .from("payment_failures")
      .select("id", { count: "exact", head: true })
      .neq("dunning_status", "resolved"),
    supabaseAdmin
      .from("consulting_sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    supabaseAdmin
      .from("profiles")
      .select("id, name, email, plan_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("payment_failures")
      .select("id, user_id, attempt_count, dunning_status, failure_reason, created_at")
      .neq("dunning_status", "resolved")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const totalUsers = totalUsersResult.count || 0
  const newUsersToday = newUsersTodayResult.count || 0
  const activeSubscriptions = activeSubsResult.count || 0
  const paymentFailures = paymentFailuresResult.count || 0
  const sessionsToday = sessionsResult.count || 0
  const recentSignups = recentSignupsResult.data || []
  const recentFailures = recentFailuresResult.data || []

  return (
    <div className="space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">管理ダッシュボード</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          SolveWise の運用状況を一覧で確認できます
        </p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="総ユーザー数"
          value={totalUsers}
          icon={<Users className="h-5 w-5" />}
          color="blue"
          href="/admin/users"
        />
        <KpiCard
          label="有料サブスク"
          value={activeSubscriptions}
          icon={<CreditCard className="h-5 w-5" />}
          color="green"
          href="/admin/billing"
        />
        <KpiCard
          label="本日のセッション"
          value={sessionsToday}
          icon={<MessageSquare className="h-5 w-5" />}
          color="purple"
          href="/admin/analytics"
        />
        <KpiCard
          label="決済失敗（未解決）"
          value={paymentFailures}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={paymentFailures > 0 ? "red" : "gray"}
          href="/admin/billing"
        />
      </div>

      {/* 2カラムレイアウト */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 直近の新規登録 */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <UserPlus className="h-4 w-4 text-blue-500" />
              直近の新規登録
            </h2>
            <Link href="/admin/users" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              すべて表示 →
            </Link>
          </div>
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {recentSignups.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-400">データがありません</p>
            ) : (
              recentSignups.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.name}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right">
                    <PlanBadge plan={user.plan_type || "free"} />
                    <p className="mt-1 text-xs text-zinc-400">{formatRelativeTime(user.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 決済失敗（要対応） */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <XCircle className="h-4 w-4 text-red-500" />
              決済失敗（要対応）
            </h2>
            <Link href="/admin/billing" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              すべて表示 →
            </Link>
          </div>
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {recentFailures.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-400">未解決の決済失敗はありません</p>
            ) : (
              recentFailures.map((failure) => (
                <div key={failure.id} className="flex items-center justify-between px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {failure.failure_reason || "不明なエラー"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">試行回数: {failure.attempt_count}回</p>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right">
                    <DunningBadge status={failure.dunning_status} />
                    <p className="mt-1 text-xs text-zinc-400">{formatRelativeTime(failure.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── サブコンポーネント ───

function KpiCard({
  label,
  value,
  icon,
  color,
  href,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  href: string
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    gray: "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }

  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color] || colorMap.gray}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </Link>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    pro: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    enterprise: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles[plan] || styles.free}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  )
}

function DunningBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    retry_scheduled: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    final_warning: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    suspended: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    resolved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  }
  const labels: Record<string, string> = {
    retry_scheduled: "再試行予定",
    final_warning: "最終警告",
    suspended: "停止中",
    resolved: "解決済み",
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>
      {labels[status] || status}
    </span>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return "たった今"
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  return date.toLocaleDateString("ja-JP")
}
