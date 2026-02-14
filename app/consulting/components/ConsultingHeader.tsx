"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Bot, Pause, CheckCircle, Sparkles, Disc } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConsultingHeaderProps {
  sessionTitle?: string
  currentRound?: number
  maxRounds?: number
  sessionStatus?: "active" | "completed" | "archived"
  onEndSession?: (status: "active" | "completed") => void
}

export function ConsultingHeader({
  sessionTitle = "AI経営相談",
  currentRound = 0,
  maxRounds = 5,
  sessionStatus,
  onEndSession,
}: ConsultingHeaderProps) {
  const progress = maxRounds > 0 ? (currentRound / maxRounds) * 100 : 0
  const isNearComplete = progress >= 80

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        {/* 左側: アイコン + タイトル + 進捗 */}
        <div className="flex items-center gap-3 overflow-hidden">
          {/* AIアイコン */}
          <div className="from-primary/20 relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br to-purple-500/20">
            <Bot className="text-primary h-5 w-5" />
            <Sparkles className="absolute -right-1 -top-1 h-3 w-3 animate-pulse text-yellow-500" />
          </div>

          {/* タイトルと進捗 */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold sm:text-lg">{sessionTitle}</h1>
              {sessionStatus === "active" && (
                <Disc className="h-3 w-3 shrink-0 fill-blue-500 text-blue-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* ラウンド表示 */}
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-xs font-medium transition-colors sm:text-sm",
                    isNearComplete ? "text-green-500" : "text-muted-foreground"
                  )}
                >
                  {currentRound}/{maxRounds}回
                </span>
                {/* ドット進捗インジケーター */}
                <div className="hidden items-center gap-1 sm:flex">
                  {Array.from({ length: maxRounds }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-all",
                        i < currentRound ? "bg-primary scale-100" : "bg-muted scale-75"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* 進捗バー（モバイルのみ） */}
              <div className="bg-muted h-1 w-12 overflow-hidden rounded-full sm:hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    isNearComplete ? "bg-green-500" : "bg-primary"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 右側: 課題継続・完了ボタン */}
        {onEndSession && (
          <div className="flex items-center gap-2">
            {/* 課題継続ボタン */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEndSession("active")}
              className="group shrink-0 gap-2"
              title="相談を一時中断します。後で再開できます。"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 transition-all group-hover:bg-blue-500">
                <Pause className="h-4 w-4 text-blue-600 transition-all group-hover:text-white" />
              </div>
              <span className="text-muted-foreground hidden transition-colors group-hover:text-blue-600 sm:inline">
                継続
              </span>
            </Button>

            {/* 課題完了ボタン */}
            <Button
              variant="default"
              size="sm"
              onClick={() => onEndSession("completed")}
              className="group shrink-0 gap-2 bg-green-500/80 hover:bg-green-600"
              title="課題が解決しました。相談を完了します。"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-50 transition-all group-hover:bg-green-200">
                <CheckCircle className="h-4 w-4 text-green-600 transition-all group-hover:text-green-800" />
              </div>
              <span className="hidden text-white sm:inline">完了</span>
            </Button>
          </div>
        )}
      </div>

      {/* 進捗バー（PC） */}
      <div className="hidden h-1 sm:block">
        <Progress
          value={progress}
          className={cn(
            "h-full rounded-none transition-all",
            isNearComplete && "[&>div]:bg-green-500"
          )}
        />
      </div>
    </div>
  )
}
