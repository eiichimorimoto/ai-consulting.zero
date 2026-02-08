/**
 * エクスポートダイアログコンポーネント
 * ステップ終了で作成したレポートのみを選択し、PDF/PPT/MD でエクスポートする。
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText, CheckSquare, Square, Download, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ReportPreview from './ReportPreview';
import { buildReportMarkdown } from '@/lib/report/builder';
import type { ReportSection } from '@/lib/report/types';

export interface StepReportItem {
  id: string;
  session_id: string;
  step_round: number;
  title: string;
  content: string;
  content_markdown: string | null;
  created_at: string;
}

interface ExportDialogProps {
  sessionId: string;
  sessionName: string;
  companyName?: string;
  userName?: string;
  onClose: () => void;
}

type ExportFormat = 'pdf' | 'ppt' | 'md';

export default function ExportDialog({
  sessionId,
  sessionName,
  companyName,
  userName,
  onClose,
}: ExportDialogProps) {
  const [stepReports, setStepReports] = useState<StepReportItem[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [loading, setLoading] = useState(true);
  const exportMetadata = {
    title: 'AI経営コンサルティングレポート',
    sessionName,
    companyName,
    userName,
    createdAt: new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSections, setPreviewSections] = useState<ReportSection[]>([]);

  const hasSelection = selectedReportIds.size > 0;

  useEffect(() => {
    let cancelled = false;
    async function fetchReports() {
      try {
        const res = await fetch(`/api/consulting/sessions/${sessionId}/reports`);
        if (!res.ok) throw new Error('Failed to fetch reports');
        const { reports } = await res.json();
        if (!cancelled) {
          setStepReports(reports ?? []);
          if ((reports ?? []).length > 0) {
            setSelectedReportIds(new Set((reports as StepReportItem[]).map((r) => r.id)));
          }
        }
      } catch (e) {
        if (!cancelled) toast.error('レポート一覧の取得に失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchReports();
    return () => { cancelled = true; };
  }, [sessionId]);

  const toggleReport = (id: string) => {
    const next = new Set(selectedReportIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedReportIds(next);
  };

  const toggleAllReports = () => {
    if (selectedReportIds.size === stepReports.length) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(stepReports.map((r) => r.id)));
    }
  };

  /** 選択されたステップレポートから ReportSection[] を構築 */
  const buildSectionsForExport = (): ReportSection[] => {
    return stepReports
      .filter((r) => selectedReportIds.has(r.id))
      .sort((a, b) => a.step_round - b.step_round)
      .map((r) => ({
        id: `step-${r.step_round}`,
        type: 'text' as const,
        title: r.title,
        content: r.content_markdown ?? r.content,
        metadata: { createdAt: r.created_at },
      }));
  };

  const handlePreview = () => {
    if (!hasSelection) {
      toast.error('エクスポートするレポートを選択してください');
      return;
    }
    try {
      const sections = buildSectionsForExport();
      setPreviewSections(sections);
      setShowPreview(true);
      toast.success('プレビューを表示しました。この内容でダウンロードできます。');
    } catch (error) {
      console.error('プレビュー生成エラー:', error);
      toast.error('プレビューの生成に失敗しました');
    }
  };

  const handleDownload = async () => {
    if (!hasSelection) {
      toast.error('エクスポートするレポートを選択してください');
      return;
    }

    setIsGenerating(true);

    try {
      const sections = buildSectionsForExport();

      if (format === 'pdf') {
        await downloadPDF(sections);
      } else if (format === 'ppt') {
        await downloadPPT(sections);
      } else {
        downloadMarkdown();
      }
    } catch (error) {
      console.error('エクスポートエラー:', error);
      const message = error instanceof Error ? error.message : 'エクスポートに失敗しました';
      const fmtMsg = format === 'pdf' ? 'PDF' : format === 'ppt' ? 'PPT' : 'Markdown';
      toast.error(`${fmtMsg}生成に失敗しました`, { description: message });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadMarkdown = () => {
    const sections = buildSectionsForExport();
    const md = buildReportMarkdown([], sections, exportMetadata);
    const blob = new Blob([md], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${sessionName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Markdownのダウンロードが完了しました', { duration: 4000 });
    setShowPreview(false);
    onClose();
  };

  // PDF生成とダウンロード
  const downloadPDF = async (sections: ReportSection[]) => {
      const response = await fetch('/api/tools/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sections,
        metadata: exportMetadata,
        orientation,
        authorLabel: 'AI参謀 - AI経営コンサルティング',
      }),
    });

    if (!response.ok) {
      let errorMessage = 'PDF生成に失敗しました';
      try {
        const error = await response.json();
        const details = error.error?.details;
        const message = error.error?.message;
        errorMessage = typeof details === 'string' ? details : message || errorMessage;
      } catch {
        errorMessage = `サーバーエラー (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    const { data } = await response.json();

    // Base64をBlobに変換
    const byteCharacters = atob(data.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: data.mimeType });

    // ダウンロードリンクを作成
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = data.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('PDFのダウンロードが完了しました', { duration: 4000 });
    setShowPreview(false);
    onClose();
  };

  // PPT生成とダウンロード
  const downloadPPT = async (sections: ReportSection[]) => {
    const response = await fetch('/api/tools/generate-presentation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections, metadata: exportMetadata }),
    });

    if (!response.ok) {
      let errorMessage = 'PPT生成に失敗しました';
      try {
        const error = await response.json();
        const details = error.error?.details;
        const message = error.error?.message;
        errorMessage = typeof details === 'string' ? details : message || errorMessage;
      } catch {
        errorMessage = `サーバーエラー (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    const { data } = await response.json();

    const byteCharacters = atob(data.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: data.mimeType });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = data.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('PPTのダウンロードが完了しました', { duration: 4000 });
    setShowPreview(false);
    onClose();
  };

  // プレビューからダウンロード
  const handlePreviewDownload = async () => {
    setShowPreview(false);
    await handleDownload();
  };

  if (showPreview) {
    return (
      <ReportPreview
        sections={previewSections}
        sessionName={sessionName}
        companyName={companyName}
        userName={userName}
        format={format}
        onClose={() => setShowPreview(false)}
        onDownload={handlePreviewDownload}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              📊 レポートのエクスポート
            </h2>
            <p className="text-sm text-gray-500">
              ステップ終了時に作成したレポートを選択し、PDF・PowerPoint・Markdownでダウンロードできます。
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDFは用紙の向きを選択できます。PPTはA4横で出力されます。プレビューは枠に合わせて縮小表示されます。
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
          <>
          {/* フォーマット選択 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              エクスポート形式
            </label>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => setFormat('pdf')}
                variant={format === 'pdf' ? 'default' : 'outline'}
                className={format === 'pdf' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={() => setFormat('ppt')}
                variant={format === 'ppt' ? 'default' : 'outline'}
                className={format === 'ppt' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
              >
                <FileText className="w-4 h-4 mr-2" />
                PowerPoint
              </Button>
              <Button
                onClick={() => setFormat('md')}
                variant={format === 'md' ? 'default' : 'outline'}
                className={format === 'md' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
              >
                <FileText className="w-4 h-4 mr-2" />
                Markdown
              </Button>
            </div>
            {format === 'pdf' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">用紙の向き</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={orientation === 'landscape' ? 'default' : 'outline'}
                    size="sm"
                    className={orientation === 'landscape' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
                    onClick={() => setOrientation('landscape')}
                  >
                    横（A4 横向き）
                  </Button>
                  <Button
                    type="button"
                    variant={orientation === 'portrait' ? 'default' : 'outline'}
                    size="sm"
                    className={orientation === 'portrait' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
                    onClick={() => setOrientation('portrait')}
                  >
                    縦（A4 縦向き）
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ステップレポート一覧 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-base font-semibold text-gray-800">
                ステップレポート
              </label>
              {stepReports.length > 0 && (
                <Button
                  onClick={toggleAllReports}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  {selectedReportIds.size === stepReports.length ? '全解除' : '全選択'}
                </Button>
              )}
            </div>
            {stepReports.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                まだステップレポートがありません。各ステップを「このステップを終了」で完了するとレポートが作成されます。
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {stepReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => toggleReport(report.id)}
                    type="button"
                    className={`
                      w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all
                      ${selectedReportIds.has(report.id)
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'}
                    `}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {selectedReportIds.has(report.id) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {report.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(report.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasSelection && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-700">
                📌 ステップレポート <strong>{selectedReportIds.size}件</strong> を選択中
              </p>
            </div>
          )}
          </>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button onClick={onClose} variant="outline">
            キャンセル
          </Button>
          <Button
            onClick={handlePreview}
            variant="outline"
            disabled={!hasSelection || isGenerating}
          >
            <Eye className="w-4 h-4 mr-2" />
            プレビュー
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!hasSelection || isGenerating}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                ダウンロード
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
