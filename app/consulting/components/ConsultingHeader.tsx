'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Bot, X, Sparkles, Disc } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConsultingHeaderProps {
  sessionTitle?: string
  currentRound?: number
  maxRounds?: number
  sessionStatus?: 'active' | 'completed' | 'archived'
  onEndSession?: () => void
}

export function ConsultingHeader({
  sessionTitle = 'AI経営相談',
  currentRound = 0,
  maxRounds = 5,
  sessionStatus,
  onEndSession
}: ConsultingHeaderProps) {
  const progress = maxRounds > 0 ? (currentRound / maxRounds) * 100 : 0
  const isNearComplete = progress >= 80

  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        {/* 左側: アイコン + タイトル + 進捗 */}
        <div className="flex items-center gap-3 overflow-hidden">
          {/* AIアイコン */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Bot className="h-5 w-5 text-primary" />
            <Sparkles className="absolute -right-1 -top-1 h-3 w-3 animate-pulse text-yellow-500" />
          </div>

          {/* タイトルと進捗 */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                {sessionTitle}
              </h1>
              {sessionStatus === 'active' && (
                <Disc className="h-3 w-3 text-blue-500 fill-blue-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* ラウンド表示 */}
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-xs font-medium transition-colors sm:text-sm",
                  isNearComplete ? "text-green-500" : "text-muted-foreground"
                )}>
                  {currentRound}/{maxRounds}回
                </span>
                {/* ドット進捗インジケーター */}
                <div className="hidden items-center gap-1 sm:flex">
                  {Array.from({ length: maxRounds }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-all",
                        i < currentRound 
                          ? "bg-primary scale-100" 
                          : "bg-muted scale-75"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* 進捗バー（モバイルのみ） */}
              <div className="h-1 w-12 overflow-hidden rounded-full bg-muted sm:hidden">
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
        
        {/* 右側: 終了ボタン */}
        {onEndSession && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onEndSession}
            className="group shrink-0 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="mr-1 h-4 w-4 transition-transform group-hover:rotate-90" />
            <span className="hidden sm:inline">終了</span>
          </Button>
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
