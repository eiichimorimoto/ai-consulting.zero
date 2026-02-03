'use client';

import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";

interface ConsultingProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ConsultingProgressBar({ currentStep, totalSteps }: ConsultingProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;
  const isComplete = currentStep === totalSteps;

  return (
    <div className="space-y-3 p-4 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950 dark:to-blue-950 rounded-lg border border-teal-200 dark:border-teal-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
            コンサルティング進捗
          </span>
          {isComplete && <Trophy className="w-4 h-4 text-yellow-500 animate-bounce" />}
        </div>
        <span className="text-lg font-bold text-teal-700 dark:text-teal-300">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="relative">
        <Progress
          value={progress}
          className="h-3 bg-white dark:bg-gray-800"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 drop-shadow-sm">
            {currentStep}/{totalSteps} STEP
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-teal-600 dark:text-teal-400">
          {isComplete ? (
            <span className="flex items-center gap-1 font-semibold">
              <Trophy className="w-3 h-3" />
              完了しました！
            </span>
          ) : (
            `あと${totalSteps - currentStep}ステップ`
          )}
        </span>
        {!isComplete && (
          <span className="text-gray-500 dark:text-gray-400">
            もう少しです！
          </span>
        )}
      </div>
    </div>
  );
}
