import { Loader2, CheckCircle2, Circle } from "lucide-react"

interface AnalysisStep {
  label: string
  duration: number
}

interface AnalysisStepsProps {
  steps: AnalysisStep[]
  currentStep: number
}

export default function AnalysisSteps({ steps, currentStep }: AnalysisStepsProps) {
  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0)
  const elapsedDuration = steps
    .slice(0, currentStep + 1)
    .reduce((sum, step) => sum + step.duration, 0)
  const remainingSeconds = Math.ceil((totalDuration - elapsedDuration) / 1000)

  return (
    <div className="rounded border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h3 className="mb-2 text-lg font-bold text-gray-900">Webサイトを分析中...</h3>
          <p className="text-sm text-gray-600">Google PageSpeed Insightsでサイトを分析しています</p>
        </div>

        {/* 進捗バー */}
        <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(95, ((currentStep + 1) / steps.length) * 100)}%` }}
          />
        </div>

        {/* 進捗ステップリスト */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                index < currentStep
                  ? "text-green-600"
                  : index === currentStep
                    ? "font-medium text-blue-600"
                    : "text-gray-400"
              }`}
            >
              {index < currentStep ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
              ) : index === currentStep ? (
                <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-blue-600" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-gray-300" />
              )}
              <span className="flex-1">{step.label}</span>
              {index === currentStep && (
                <span className="animate-pulse text-xs text-gray-500">実行中</span>
              )}
            </div>
          ))}
        </div>

        {/* 推定残り時間 */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 text-sm">
          <span className="text-gray-500">
            ステップ {currentStep + 1} / {steps.length}
          </span>
          <span className="text-gray-500">推定残り時間: 約{remainingSeconds}秒</span>
        </div>
      </div>
    </div>
  )
}
