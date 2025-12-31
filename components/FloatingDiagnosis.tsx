'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Loader2, AlertTriangle, BarChart2, CheckCircle2, Circle } from 'lucide-react';

interface DiagnosisResult {
  overallScore: number;
  topIssues: Array<{
    category: string;
    severity: string;
    issue: string;
    impact: string;
  }>;
  metrics: any;
  url: string;
}

export default function FloatingDiagnosis() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  // 分析ステップの定義
  const analysisSteps = [
    { label: 'サイトに接続中...', duration: 2000 },
    { label: 'ページ構造を解析中...', duration: 3000 },
    { label: 'パフォーマンスを測定中...', duration: 5000 },
    { label: 'SEO要素をチェック中...', duration: 4000 },
    { label: 'セキュリティを確認中...', duration: 3000 },
    { label: 'AIが課題を分析中...', duration: 8000 },
    { label: 'レポートを生成中...', duration: 3000 },
  ];

  // 分析中のステップ進行
  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStep(0);
      return;
    }

    let stepIndex = 0;
    const advanceStep = () => {
      if (stepIndex < analysisSteps.length - 1) {
        stepIndex++;
        setCurrentStep(stepIndex);
      }
    };

    // 各ステップの時間に応じて進行
    const timers: NodeJS.Timeout[] = [];
    let accumulatedTime = 0;
    
    analysisSteps.forEach((step, index) => {
      if (index > 0) {
        accumulatedTime += analysisSteps[index - 1].duration;
        const timer = setTimeout(() => {
          setCurrentStep(index);
        }, accumulatedTime);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isAnalyzing]);

  // ダッシュボード、認証ページ、診断ページでは非表示
  const hiddenPaths = ['/dashboard', '/auth/', '/diagnosis/'];
  const shouldHide = hiddenPaths.some(path => pathname.startsWith(path));

  if (shouldHide) return null;

  const handleAnalyze = async () => {
    if (!url) return;
    setIsAnalyzing(true);
    setError(null);
    setDiagnosisResult(null);

    try {
      const response = await fetch('/api/diagnose-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '分析に失敗しました');
      }

      // 診断結果を表示
      setDiagnosisResult({
        overallScore: result.data.overallScore,
        topIssues: result.data.topIssues,
        metrics: result.data.metrics,
        url: result.data.url,
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || '分析中にエラーが発生しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewFullReport = () => {
    if (!diagnosisResult) return;
    
    // 診断データをsessionStorageに保存
    const diagnosisData = {
      overallScore: diagnosisResult.overallScore,
      topIssues: diagnosisResult.topIssues,
      metrics: diagnosisResult.metrics,
      url: diagnosisResult.url,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem('pendingDiagnosis', JSON.stringify(diagnosisData));
    
    // サインアップページへリダイレクト
    router.push('/auth/sign-up?from=diagnosis');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const handleReset = () => {
    setDiagnosisResult(null);
    setUrl('');
    setError(null);
  };

  return (
    <>
      {/* フローティングボタン（閉じている時） */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all animate-pulse hover:animate-none"
        >
          <BarChart2 className="w-6 h-6" />
          <span>AI無料診断スタート</span>
        </button>
      )}

      {/* フローティングパネル（開いている時） */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[80vh] overflow-y-auto">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 flex justify-between items-center sticky top-0">
            <div className="text-white">
              <div className="font-bold text-sm">貴社Webサイトの状況診断を行います</div>
              <div className="text-xs text-red-100">30秒で課題を発見</div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                handleReset();
              }}
              className="text-white/80 hover:text-white p-1"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* 診断結果がない場合：入力フォーム */}
          {!diagnosisResult && (
            <div className="p-4">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="貴社サイトのURLを入力してください"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={isAnalyzing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && url) {
                      handleAnalyze();
                    }
                  }}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={!url || isAnalyzing}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '診断'
                  )}
                </button>
              </div>

              {isAnalyzing && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  {/* 進捗バー */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(95, ((currentStep + 1) / analysisSteps.length) * 100)}%` }}
                    />
                  </div>
                  
                  {/* 進捗ステップリスト */}
                  <div className="space-y-1.5">
                    {analysisSteps.map((step, index) => (
                      <div 
                        key={index}
                        className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                          index < currentStep 
                            ? 'text-green-600' 
                            : index === currentStep 
                              ? 'text-red-600 font-medium' 
                              : 'text-gray-300'
                        }`}
                      >
                        {index < currentStep ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : index === currentStep ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        )}
                        <span>{step.label}</span>
                        {index === currentStep && (
                          <span className="ml-auto text-[10px] text-gray-400 animate-pulse">実行中</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 推定残り時間 */}
                  <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">
                      ステップ {currentStep + 1} / {analysisSteps.length}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      約{Math.max(5, 30 - currentStep * 4)}秒
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              )}

              <div className="mt-3 flex justify-between text-xs text-gray-400">
                <span>診断実績 7社</span>
                <span>課題発見率 100%</span>
              </div>
            </div>
          )}

          {/* 診断結果がある場合：簡易結果表示 */}
          {diagnosisResult && (
            <div className="p-4">
              {/* スコア */}
              <div className="text-center mb-4 p-4 bg-gray-50 rounded-xl">
                <div className={`text-4xl font-bold ${getScoreColor(diagnosisResult.overallScore)}`}>
                  {diagnosisResult.overallScore}
                  <span className="text-lg text-gray-400">/100</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">総合スコア</div>
                <div className="text-xs text-gray-400 mt-1 truncate">{diagnosisResult.url}</div>
              </div>

              {/* 課題プレビュー */}
              <div className="mb-4">
                <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  検出された課題（上位3つ）
                </h4>
                <div className="space-y-2">
                  {diagnosisResult.topIssues.slice(0, 3).map((issue, index) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-50 rounded-lg border-l-3 border-l-red-500 text-xs"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                          {issue.severity === 'critical' ? '重大' : issue.severity === 'high' ? '高' : '中'}
                        </span>
                        <span className="text-gray-400 uppercase text-[10px]">{issue.category}</span>
                      </div>
                      <p className="text-gray-700 font-medium">{issue.issue}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 text-center">
                  完全なレポートには詳細な分析と改善提案が含まれます
                </p>
                <button
                  onClick={handleViewFullReport}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  完全な診断レポートを見る（無料）
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-2 text-gray-500 text-xs hover:text-gray-700 transition-colors"
                >
                  別のサイトを診断する
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
