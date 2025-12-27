'use client';

import { useRouter } from 'next/navigation';

interface DiagnosisPreviewModalProps {
  data: {
    overallScore: number;
    topIssues: Array<{
      category: string;
      severity: string;
      issue: string;
      impact: string;
    }>;
    companyId: string | null;
    reportId: string;
    metrics?: any;
    url?: string;
  };
  onClose: () => void;
}

export function DiagnosisPreviewModal({ data, onClose }: DiagnosisPreviewModalProps) {
  const router = useRouter();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return '良好です';
    if (score >= 60) return '改善の余地があります';
    if (score >= 40) return '早急な対策が必要です';
    return '重大な問題があります';
  };

  const handleViewFullReport = () => {
    // 診断データをsessionStorageに保存
    const diagnosisData = {
      overallScore: data.overallScore,
      topIssues: data.topIssues,
      metrics: data.metrics,
      url: data.url,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem('pendingDiagnosis', JSON.stringify(diagnosisData));
    
    // サインアップページへリダイレクト
    router.push('/auth/sign-up?from=diagnosis');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-2xl w-full border border-white/20 shadow-2xl">
        {/* ヘッダー */}
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                診断結果が出ました
              </h2>
              <p className="text-gray-400 text-sm">
                あなたのWebサイトの健康状態を分析しました
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 総合スコア */}
        <div className="p-6 text-center border-b border-white/10">
          <div className="inline-block">
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(data.overallScore)}`}>
              {data.overallScore}
              <span className="text-2xl text-gray-400">/100</span>
            </div>
            <div className="text-gray-300">
              {getScoreMessage(data.overallScore)}
            </div>
          </div>
        </div>

        {/* 重大な課題 */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            ⚠️ 検出された重大な課題（上位3つ）
          </h3>
          <div className="space-y-3">
            {data.topIssues.slice(0, 3).map((issue, index) => (
              <div
                key={index}
                className="bg-white/5 rounded-lg p-4 border-l-4 border-red-500"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                    {issue.severity}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {issue.category}
                  </span>
                </div>
                <p className="text-white font-semibold mb-1">
                  {issue.issue}
                </p>
                <p className="text-gray-400 text-sm">
                  💰 {issue.impact}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 bg-white/5">
          <div className="text-center mb-4">
            <p className="text-gray-300 text-sm mb-2">
              これは診断結果の一部です
            </p>
            <p className="text-white font-semibold">
              完全な診断レポート・改善提案を無料で受け取る
            </p>
          </div>
          <button
            onClick={handleViewFullReport}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
          >
            完全な診断レポートを見る（無料）
          </button>
          <p className="text-center text-gray-400 text-xs mt-3">
            アカウント作成が必要です（無料）
          </p>
        </div>
      </div>
    </div>
  );
}
