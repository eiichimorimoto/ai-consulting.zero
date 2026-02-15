"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            エラーが発生しました
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {error.message || "予期しないエラーが発生しました。もう一度お試しください。"}
          </p>
          {error.digest && (
            <p className="text-xs text-zinc-400 mt-2 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          再試行
        </button>
      </div>
    </div>
  )
}
