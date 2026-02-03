export default function DashboardLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--bg-main,#F8FAFC)]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary,#6366F1)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-[var(--text-secondary,#64748B)]">読み込み中...</p>
      </div>
    </div>
  )
}
