/**
 * エクスポートダイアログコンポーネント
 * セクション選択 → プレビュー → ダウンロードの統合UI
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText, CheckSquare, Square, Download, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getAvailableSections, buildReportSections, getDifyContentItems, buildReportSectionsFromDifyItems, buildReportMarkdown } from '@/lib/report/builder';
import ReportPreview from './ReportPreview';
import type { Message } from '@/types/consulting';
import type { SectionId, AvailableSection, ReportSection, DifyContentItem } from '@/lib/report/types';

interface ExportDialogProps {
  messages: Message[];
  sessionName: string;
  companyName?: string;
  userName?: string;
  onClose: () => void;
}

type ExportFormat = 'pdf' | 'ppt' | 'md';

/** セクションIDから表示用の「場所」ラベルを返す */
function getSectionLocation(id: SectionId): string {
  if (id === 'chat') return 'チャット';
  return 'AI回答';
}

export default function ExportDialog({
  messages,
  sessionName,
  companyName,
  userName,
  onClose,
}: ExportDialogProps) {
  // State
  const [selectedSections, setSelectedSections] = useState<Set<SectionId>>(new Set());
  const [availableSections, setAvailableSections] = useState<AvailableSection[]>([]);
  const [difyItems, setDifyItems] = useState<DifyContentItem[]>([]);
  const [selectedDifyIds, setSelectedDifyIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
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

  const hasSelection = selectedSections.size > 0 || selectedDifyIds.size > 0;

  // 利用可能なセクションとAI回答を取得。会話は初期チェックなし、AIの回答は一番新しい1件のみデフォルト選択
  useEffect(() => {
    const sections = getAvailableSections(messages);
    setAvailableSections(sections);
    const items = getDifyContentItems(messages);
    setDifyItems(items);
    const newestId = items.length > 0 ? items[items.length - 1].id : null;
    setSelectedDifyIds(newestId ? new Set([newestId]) : new Set());
  }, [messages]);

  // AIの回答を新しい順で表示用にソート
  const sortedDifyItems = useMemo(
    () => [...difyItems].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [difyItems]
  );

  // セクション選択トグル
  const toggleSection = (sectionId: SectionId) => {
    const newSet = new Set(selectedSections);
    if (newSet.has(sectionId)) {
      newSet.delete(sectionId);
    } else {
      newSet.add(sectionId);
    }
    setSelectedSections(newSet);
  };

  // 全選択/全解除（会話セクションのみ）
  const toggleAll = () => {
    if (selectedSections.size === availableSections.filter(s => s.available).length) {
      setSelectedSections(new Set());
    } else {
      const allIds = availableSections.filter(s => s.available).map(s => s.id);
      setSelectedSections(new Set(allIds as SectionId[]));
    }
  };

  const toggleDifyItem = (id: string) => {
    const next = new Set(selectedDifyIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDifyIds(next);
  };

  /** 選択内容からレポートセクションを構築（主役: AIのレポート内容・降順、付録: 会話セクション） */
  const buildSectionsForExport = (): ReportSection[] => {
    const selectedDify = difyItems
      .filter(i => selectedDifyIds.has(i.id))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const fromDify = selectedDify.length > 0 ? buildReportSectionsFromDifyItems(selectedDify) : [];
    const fromSections = selectedSections.size > 0
      ? buildReportSections(messages, Array.from(selectedSections))
      : [];
    return [...fromDify, ...fromSections];
  };

  // プレビュー表示
  const handlePreview = () => {
    if (!hasSelection) {
      toast.error('エクスポートする内容を選択してください');
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

  // ダウンロード実行
  const handleDownload = async () => {
    if (!hasSelection) {
      toast.error('エクスポートする内容を選択してください');
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

  // Markdownダウンロード（クライアント側で生成）
  const downloadMarkdown = () => {
    const selectedDify = difyItems.filter(i => selectedDifyIds.has(i.id));
    const fromSections = selectedSections.size > 0
      ? buildReportSections(messages, Array.from(selectedSections))
      : [];
    const md = buildReportMarkdown(selectedDify, fromSections, exportMetadata);
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
              会話内容をPDFまたはPowerPointでダウンロードできます。含めるセクションを選択してください。
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

          {/* AIの回答（メイン。新しい順・作成時間表示・デフォルトで全選択） */}
          {difyItems.length > 0 && (
            <div className="mb-6">
              <label className="block text-base font-semibold text-gray-800 mb-2">
                AIの回答（レポート形式で成型してPDFに）
              </label>
              <p className="text-xs text-gray-500 mb-3">
                個別に選択すると、それぞれをレポート体裁で1セクションとしてPDFに含めます。新しい順で表示しています。
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {sortedDifyItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleDifyItem(item.id)}
                    type="button"
                    className={`
                      w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all
                      ${selectedDifyIds.has(item.id)
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'}
                    `}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {selectedDifyIds.has(item.id) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>
                          {item.type === 'analysis' && '分析'}
                          {item.type === 'recommendation' && '提言'}
                          {item.type === 'summary' && 'サマリー'}
                          {item.type === 'other' && 'その他'}
                        </span>
                        {item.createdAt && (
                          <span>
                            {new Date(item.createdAt).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        <span className="truncate">· {item.body.slice(0, 40)}…</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 会話・セクション（付録。固定内容・2列でコンパクトに） */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-500">
                会話・セクション（付録）
              </label>
              <Button
                onClick={toggleAll}
                variant="ghost"
                size="sm"
                className="text-xs text-indigo-600 hover:text-indigo-700 h-6 px-2"
              >
                {selectedSections.size === availableSections.filter(s => s.available).length
                  ? '全解除'
                  : '全選択'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {availableSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => section.available && toggleSection(section.id)}
                  disabled={!section.available}
                  className={`
                    flex items-start gap-2 p-2 rounded-md border text-left transition-all
                    ${
                      section.available
                        ? selectedSections.has(section.id)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                    }
                  `}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {selectedSections.has(section.id) ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-xs leading-tight">
                      {section.label}
                      {section.messageCount !== undefined && (
                        <span className="ml-1 font-normal text-gray-500">({section.messageCount})</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {getSectionLocation(section.id)}
                    </div>
                    {!section.available && (
                      <div className="text-xs text-amber-600 mt-0.5">
                        ⚠ データなし
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 選択サマリー */}
          {hasSelection && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-700">
                📌
                {selectedDifyIds.size > 0 && selectedSections.size > 0 ? (
                  <> レポートの主役: AI回答 <strong>{selectedDifyIds.size}件</strong> · 付録: 会話セクション <strong>{selectedSections.size}個</strong></>
                ) : selectedDifyIds.size > 0 ? (
                  <> AI回答 <strong>{selectedDifyIds.size}件</strong></>
                ) : (
                  <> 会話セクション <strong>{selectedSections.size}個</strong></>
                )}
                {' '}を選択中
              </p>
            </div>
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
