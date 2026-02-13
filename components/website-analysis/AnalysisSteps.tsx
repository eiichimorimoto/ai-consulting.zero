import { Loader2, CheckCircle2, Circle } from 'lucide-react'

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
  const elapsedDuration = steps.slice(0, currentStep + 1).reduce((sum, step) => sum + step.duration, 0)
  const remainingSeconds = Math.ceil((totalDuration - elapsedDuration) / 1000)

  return (
    <div className="bg-white rounded shadow-sm border border-gray-200 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Webサイトを分析中...</h3>
          <p className="text-sm text-gray-600">
            Google PageSpeed Insightsでサイトを分析しています
          </p>
        </div>

        {/* 進捗バー */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-6">
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
                  ? 'text-green-600' 
                  : index === currentStep 
                    ? 'text-blue-600 font-medium' 
                    : 'text-gray-400'
              }`}
            >
              {index < currentStep ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : index === currentStep ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
              <span className="flex-1">{step.label}</span>
              {index === currentStep && (
                <span className="text-xs text-gray-500 animate-pulse">実行中</span>
              )}
            </div>
          ))}
        </div>

        {/* 推定残り時間 */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center text-sm">
          <span className="text-gray-500">
            ステップ {currentStep + 1} / {steps.length}
          </span>
          <span className="text-gray-500">
            推定残り時間: 約{remainingSeconds}秒
          </span>
        </div>
      </div>
    </div>
  )
}
