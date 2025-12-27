'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Download, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReportData {
  id: string;
  email: string;
  company_name: string;
  url: string;
  overall_score: number;
  top_issues: Array<{
    category: string;
    severity: string;
    issue: string;
    impact: string;
  }>;
  metrics: {
    mobileScore: number;
    desktopScore: number;
    seoScore: number;
    accessibilityScore: number;
    hasSSL: boolean;
    isMobileFriendly: boolean;
    fcp: number;
    lcp: number;
    cls: string;
  };
  created_at: string;
}

export default function DiagnosisReportPage() {
  const params = useParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/diagnosis-report/${params.id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'レポートの取得に失敗しました');
        }

        setReport(result.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchReport();
    }
  }, [params.id]);

  const handleDownloadPNG = async () => {
    if (!report || !printRef.current) return;
    setDownloading(true);

    try {
      const element = printRef.current;
      
      // 印刷用エリアをキャプチャ（白背景）
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // PNGとしてダウンロード
      const link = document.createElement('a');
      link.download = `診断レポート_${report.company_name}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err: any) {
      console.error('PNG generation error:', err);
      alert('画像の生成に失敗しました: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getSeverityBorderColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-yellow-500';
      default: return 'border-green-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">レポートを読み込み中...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'レポートが見つかりません'}</div>
          <a href="/" className="text-blue-400 hover:underline">トップページへ戻る</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-4 pb-16">
      {/* ダウンロードボタン（印刷用エリア外） */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-end">
        <button
          onClick={handleDownloadPNG}
          disabled={downloading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
        >
          <Download className="w-5 h-5" />
          {downloading ? 'ダウンロード中...' : '画像でダウンロード'}
        </button>
      </div>

      {/* 印刷用エリア（白背景・1ページ収まり） */}
      <div 
        ref={printRef} 
        className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6"
        style={{ minHeight: '1100px' }}
      >
        {/* ヘッダー */}
        <div className="border-b-2 border-blue-600 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Webサイト診断レポート
              </h1>
              <p className="text-gray-700 font-semibold">{report.company_name}</p>
              <p className="text-blue-600 text-sm">{report.url}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">診断日時</div>
              <div className="text-sm text-gray-700">{new Date(report.created_at).toLocaleString('ja-JP')}</div>
            </div>
          </div>
        </div>

        {/* 総合スコア */}
        <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className={`text-5xl font-bold ${getScoreColor(report.overall_score)}`}>
              {report.overall_score}
            </div>
            <div className="text-gray-500 text-sm mt-1">総合スコア</div>
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full ${getScoreBgColor(report.overall_score)} transition-all`}
                style={{ width: `${report.overall_score}%` }}
              ></div>
            </div>
            <p className="text-gray-600 mt-2 text-sm">
              {report.overall_score >= 80 && '良好な状態です。細かい改善で更に向上できます。'}
              {report.overall_score >= 60 && report.overall_score < 80 && '改善の余地があります。主要な課題に対処することをお勧めします。'}
              {report.overall_score >= 40 && report.overall_score < 60 && '早急な対策が必要です。重大な課題が検出されています。'}
              {report.overall_score < 40 && '重大な問題があります。至急対応が必要です。'}
            </p>
          </div>
        </div>

        {/* パフォーマンス指標 */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            パフォーマンス指標
          </h2>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center border">
              <div className={`text-2xl font-bold ${getScoreColor(report.metrics.mobileScore)}`}>
                {report.metrics.mobileScore}
              </div>
              <div className="text-gray-500 text-xs mt-1">モバイル</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center border">
              <div className={`text-2xl font-bold ${getScoreColor(report.metrics.desktopScore)}`}>
                {report.metrics.desktopScore}
              </div>
              <div className="text-gray-500 text-xs mt-1">デスクトップ</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center border">
              <div className={`text-2xl font-bold ${getScoreColor(report.metrics.seoScore)}`}>
                {report.metrics.seoScore}
              </div>
              <div className="text-gray-500 text-xs mt-1">SEO</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center border">
              <div className={`text-2xl font-bold ${getScoreColor(report.metrics.accessibilityScore)}`}>
                {report.metrics.accessibilityScore}
              </div>
              <div className="text-gray-500 text-xs mt-1">アクセシビリティ</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-center gap-2 mb-1">
                {report.metrics.hasSSL ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-gray-700 font-semibold text-sm">SSL対応</span>
              </div>
              <div className={`text-sm ${report.metrics.hasSSL ? 'text-green-600' : 'text-red-600'}`}>
                {report.metrics.hasSSL ? '対応済み' : '未対応'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-center gap-2 mb-1">
                {report.metrics.isMobileFriendly ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-gray-700 font-semibold text-sm">モバイル対応</span>
              </div>
              <div className={`text-sm ${report.metrics.isMobileFriendly ? 'text-green-600' : 'text-red-600'}`}>
                {report.metrics.isMobileFriendly ? '対応済み' : '改善が必要'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <div className="text-gray-700 font-semibold text-sm mb-1">Core Web Vitals</div>
              <div className="text-xs text-gray-600 space-y-0.5">
                <div>FCP: {report.metrics.fcp}ms</div>
                <div>LCP: {report.metrics.lcp}ms</div>
                <div>CLS: {report.metrics.cls}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 検出された課題 */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            検出された課題
          </h2>
          <div className="space-y-3">
            {report.top_issues.map((issue, index) => (
              <div
                key={index}
                className={`bg-gray-50 rounded-lg p-4 border-l-4 ${getSeverityBorderColor(issue.severity)}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <span className={`px-2 py-0.5 ${getSeverityColor(issue.severity)} text-white text-xs font-bold rounded`}>
                    {issue.severity === 'critical' && '重大'}
                    {issue.severity === 'high' && '高'}
                    {issue.severity === 'medium' && '中'}
                    {issue.severity === 'low' && '低'}
                  </span>
                  <span className="text-gray-400 text-xs uppercase">{issue.category}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{issue.issue}</h3>
                <p className="text-gray-600 text-sm">
                  <span className="text-orange-600 font-semibold">ビジネスへの影響: </span>
                  {issue.impact}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-6 pt-4 border-t text-gray-400 text-xs">
          <p>© AI Consulting Zero - Webサイト診断サービス</p>
        </div>
      </div>
    </div>
  );
}
