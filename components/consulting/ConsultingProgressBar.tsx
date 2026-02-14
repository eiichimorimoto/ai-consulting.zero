"use client"

import { Progress } from "@/components/ui/progress"
import { Trophy } from "lucide-react"

interface ConsultingProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function ConsultingProgressBar({ currentStep, totalSteps }: ConsultingProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100
  const isComplete = currentStep === totalSteps

  return (
    <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-400">コンサルティング進捗</span>
          {isComplete && <Trophy className="h-4 w-4 animate-bounce text-yellow-400" />}
        </div>
        <span className="text-lg font-bold text-slate-400">{Math.round(progress)}%</span>
      </div>

      <div className="relative">
        <Progress
          value={progress}
          className="h-3 bg-slate-200 dark:bg-slate-700"
          indicatorClassName="bg-blue-500"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-slate-400 drop-shadow-sm">
            {currentStep}/{totalSteps} STEP
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {isComplete ? (
            <span className="flex items-center gap-1 font-semibold">
              <Trophy className="h-3 w-3" />
              完了しました！
            </span>
          ) : (
            `あと${totalSteps - currentStep}ステップ`
          )}
        </span>
        {!isComplete && <span>もう少しです！</span>}
      </div>
    </div>
  )
}
