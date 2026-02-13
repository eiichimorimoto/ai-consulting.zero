import { RefreshCw, Smartphone, Zap, TrendingUp, CheckCircle, Shield } from 'lucide-react'
import { 
  getScoreColor, 
  getScoreBgColor, 
  getSeverityColor, 
  getSeverityLabel, 
  getCategoryIcon, 
  getCategoryLabel 
} from '@/lib/website-analysis/helpers'

interface DiagnosisResultProps {
  result: {
    overallScore: number
    topIssues: {
      category: string
      severity: string
      issue: string
      impact: string
    }[]
    metrics?: {
      mobileScore: number
      desktopScore: number
      seoScore: number
      accessibilityScore: number
      hasSSL: boolean
      isMobileFriendly: boolean
      fcp: number
      lcp: number
      cls: string
      ttfb: number
      tbt: number
    }
    url?: string
  }
  isAnalyzing: boolean
  onReanalyze: () => void
  onConsult: () => void
}

export default function DiagnosisResult({
  result,
  isAnalyzing,
  onReanalyze,
  onConsult,
}: DiagnosisResultProps) {
  return (
    <div className="space-y-6">
      {/* 再分析ボタン */}
      <div className="flex justify-end">
        <button
          onClick={onReanalyze}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          再分析
        </button>
      </div>

      {/* Overall Score */}
      <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">診断結果</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{result.url}</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(result.overallScore)}`}>
              {result.overallScore}
            </div>
            <div className="text-gray-600 mt-1">総合スコア</div>
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className={`h-full ${getScoreBgColor(result.overallScore)} transition-all duration-500`}
                style={{ width: `${result.overallScore}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {result.metrics && (
        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">詳細メトリクス</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-sm">
              <Smartphone className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.mobileScore)}`} />
              <div className={`text-2xl font-bold ${getScoreColor(result.metrics.mobileScore)}`}>
                {result.metrics.mobileScore}
              </div>
              <div className="text-sm text-gray-600">モバイル</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-sm">
              <Zap className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.desktopScore)}`} />
              <div className={`text-2xl font-bold ${getScoreColor(result.metrics.desktopScore)}`}>
                {result.metrics.desktopScore}
              </div>
              <div className="text-sm text-gray-600">デスクトップ</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-sm">
              <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.seoScore)}`} />
              <div className={`text-2xl font-bold ${getScoreColor(result.metrics.seoScore)}`}>
                {result.metrics.seoScore}
              </div>
              <div className="text-sm text-gray-600">SEO</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-sm">
              <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(result.metrics.accessibilityScore)}`} />
              <div className={`text-2xl font-bold ${getScoreColor(result.metrics.accessibilityScore)}`}>
                {result.metrics.accessibilityScore}
              </div>
              <div className="text-sm text-gray-600">アクセシビリティ</div>
            </div>
          </div>
          
          {/* Core Web Vitals */}
          <h3 className="text-md font-semibold text-gray-800 mb-3">Core Web Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="p-3 border border-gray-200 rounded-sm">
              <div className="text-xs text-gray-600 mb-1">FCP (初回描画)</div>
              <div className={`text-lg font-bold ${result.metrics.fcp <= 1800 ? 'text-green-500' : result.metrics.fcp <= 3000 ? 'text-yellow-500' : 'text-red-500'}`}>
                {(result.metrics.fcp / 1000).toFixed(2)}秒
              </div>
              <div className="text-xs text-gray-500">目標: 1.8秒以下</div>
            </div>
            <div className="p-3 border border-gray-200 rounded-sm">
              <div className="text-xs text-gray-600 mb-1">LCP (最大描画)</div>
              <div className={`text-lg font-bold ${result.metrics.lcp <= 2500 ? 'text-green-500' : result.metrics.lcp <= 4000 ? 'text-yellow-500' : 'text-red-500'}`}>
                {(result.metrics.lcp / 1000).toFixed(2)}秒
              </div>
              <div className="text-xs text-gray-500">目標: 2.5秒以下</div>
            </div>
            <div className="p-3 border border-gray-200 rounded-sm">
              <div className="text-xs text-gray-600 mb-1">CLS (シフト)</div>
              <div className={`text-lg font-bold ${parseFloat(result.metrics.cls) <= 0.1 ? 'text-green-500' : parseFloat(result.metrics.cls) <= 0.25 ? 'text-yellow-500' : 'text-red-500'}`}>
                {result.metrics.cls}
              </div>
              <div className="text-xs text-gray-500">目標: 0.1以下</div>
            </div>
            <div className="p-3 border border-gray-200 rounded-sm">
              <div className="text-xs text-gray-600 mb-1">TTFB (応答)</div>
              <div className={`text-lg font-bold ${result.metrics.ttfb <= 600 ? 'text-green-500' : result.metrics.ttfb <= 1000 ? 'text-yellow-500' : 'text-red-500'}`}>
                {(result.metrics.ttfb / 1000).toFixed(2)}秒
              </div>
              <div className="text-xs text-gray-500">目標: 0.6秒以下</div>
            </div>
            <div className="p-3 border border-gray-200 rounded-sm">
              <div className="text-xs text-gray-600 mb-1">TBT (ブロック)</div>
              <div className={`text-lg font-bold ${result.metrics.tbt <= 200 ? 'text-green-500' : result.metrics.tbt <= 600 ? 'text-yellow-500' : 'text-red-500'}`}>
                {result.metrics.tbt}ms
              </div>
              <div className="text-xs text-gray-500">目標: 200ms以下</div>
            </div>
          </div>

          {/* SSL & Mobile Friendly */}
          <div className="flex gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-sm ${result.metrics.hasSSL ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <Shield className="w-4 h-4" />
              SSL: {result.metrics.hasSSL ? '対応済み' : '未対応'}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-sm ${result.metrics.isMobileFriendly ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <Smartphone className="w-4 h-4" />
              モバイル対応: {result.metrics.isMobileFriendly ? '良好' : '要改善'}
            </div>
          </div>
        </div>
      )}

      {/* Issues */}
      {result.topIssues && result.topIssues.length > 0 && (
        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">検出された課題</h2>
          <div className="space-y-4">
            {result.topIssues.map((issue, index) => (
              <div 
                key={index}
                className={`p-4 rounded-sm border ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getCategoryIcon(issue.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                        {getCategoryLabel(issue.category)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        issue.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                        issue.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        issue.severity === 'low' ? 'bg-blue-200 text-blue-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {getSeverityLabel(issue.severity)}
                      </span>
                    </div>
                    <div className="font-semibold text-lg mb-1">{issue.issue}</div>
                    <p className="text-sm opacity-80">{issue.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded p-6 text-white">
        <h2 className="text-lg font-bold mb-2">改善のご提案</h2>
        <p className="text-blue-100 mb-4">
          検出された課題を解決することで、ユーザー体験の向上と検索順位の改善が期待できます。
          詳細な改善プランについてはお問い合わせください。
        </p>
        <button
          onClick={onConsult}
          className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-sm hover:bg-blue-50 transition-colors"
        >
          改善について相談する
        </button>
      </div>
    </div>
  )
}
