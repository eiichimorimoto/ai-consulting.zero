/**
 * エクスポートダイアログコンポーネント
 * セクション選択 → プレビュー → ダウンロードの統合UI
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText, CheckSquare, Square, Download, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getAvailableSections, buildReportSections } from '@/lib/report/builder';
import ReportPreview from './ReportPreview';
import type { Message } from '@/types/consulting';
import type { SectionId, AvailableSection, ReportSection } from '@/lib/report/types';

interface ExportDialogProps {
  messages: Message[];
  sessionName: string;
  companyName?: string;
  userName?: string;
  onClose: () => void;
}

type ExportFormat = 'pdf' | 'ppt';

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
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSections, setPreviewSections] = useState<ReportSection[]>([]);

  // 利用可能なセクションを取得
  useEffect(() => {
    const sections = getAvailableSections(messages);
    setAvailableSections(sections);

    // デフォルトで会話履歴を選択
    if (sections.find(s => s.id === 'chat' && s.available)) {
      setSelectedSections(new Set(['chat']));
    }
  }, [messages]);

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

  // 全選択/全解除
  const toggleAll = () => {
    if (selectedSections.size === availableSections.filter(s => s.available).length) {
      setSelectedSections(new Set());
    } else {
      const allIds = availableSections.filter(s => s.available).map(s => s.id);
      setSelectedSections(new Set(allIds));
    }
  };

  // プレビュー表示
  const handlePreview = () => {
    if (selectedSections.size === 0) {
      toast.error('エクスポートするセクションを選択してください');
      return;
    }

    try {
      // レポートセクションを構築
      const sections = buildReportSections(messages, Array.from(selectedSections));
      setPreviewSections(sections);
      setShowPreview(true);
    } catch (error) {
      console.error('プレビュー生成エラー:', error);
      toast.error('プレビューの生成に失敗しました');
    }
  };

  // ダウンロード実行
  const handleDownload = async () => {
    if (selectedSections.size === 0) {
      toast.error('エクスポートするセクションを選択してください');
      return;
    }

    setIsGenerating(true);

    try {
      // レポートセクションを構築
      const sections = buildReportSections(messages, Array.from(selectedSections));

      if (format === 'pdf') {
        await downloadPDF(sections);
      } else {
        toast.info('PPT形式は現在開発中です');
      }
    } catch (error) {
      console.error('エクスポートエラー:', error);
      toast.error('エクスポートに失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // PDF生成とダウンロード
  const downloadPDF = async (sections: ReportSection[]) => {
    const response = await fetch('/api/tools/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sections,
        metadata: {
          title: 'AI経営コンサルティングレポート',
          sessionName,
          companyName,
          userName,
          createdAt: new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'PDF生成に失敗しました');
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

    toast.success('PDFをダウンロードしました');
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
              ダウンロードするセクションを選択してください
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
            <div className="flex gap-3">
              <Button
                onClick={() => setFormat('pdf')}
                variant={format === 'pdf' ? 'default' : 'outline'}
                className={format === 'pdf' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={() => setFormat('ppt')}
                variant={format === 'ppt' ? 'default' : 'outline'}
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                <FileText className="w-4 h-4 mr-2" />
                PowerPoint（準備中）
              </Button>
            </div>
          </div>

          {/* セクション選択 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                含めるセクション
              </label>
              <Button
                onClick={toggleAll}
                variant="ghost"
                size="sm"
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                {selectedSections.size === availableSections.filter(s => s.available).length
                  ? '全解除'
                  : '全選択'}
              </Button>
            </div>

            <div className="space-y-2">
              {availableSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => section.available && toggleSection(section.id)}
                  disabled={!section.available}
                  className={`
                    w-full flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all
                    ${
                      section.available
                        ? selectedSections.has(section.id)
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                    }
                  `}
                >
                  {/* チェックボックスアイコン */}
                  <div className="flex-shrink-0 mt-0.5">
                    {selectedSections.has(section.id) ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* セクション情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 mb-1">
                      {section.label}
                      {section.messageCount !== undefined && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          ({section.messageCount}件)
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {section.description}
                    </div>
                    {!section.available && (
                      <div className="text-xs text-amber-600 mt-1">
                        ⚠️ このセクションのデータがありません
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 選択サマリー */}
          {selectedSections.size > 0 && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-700">
                📌 <strong>{selectedSections.size}個</strong>のセクションを選択中
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
            disabled={selectedSections.size === 0 || isGenerating}
          >
            <Eye className="w-4 h-4 mr-2" />
            プレビュー
          </Button>
          <Button
            onClick={handleDownload}
            disabled={selectedSections.size === 0 || isGenerating}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
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
