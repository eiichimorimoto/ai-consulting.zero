/**
 * レポートプレビューコンポーネント
 * 生成前にレポート内容をHTMLでプレビュー表示
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import type { ReportSection, ChatData, TableData, ListData } from '@/lib/report/types';

/** A4横のピクセル寸法（96dpi想定） */
const PAPER_WIDTH_PX = 1122;
const PAPER_HEIGHT_PX = 794;

interface ReportPreviewProps {
  sections: ReportSection[];
  sessionName: string;
  companyName?: string;
  userName?: string;
  /** 選択中の出力形式（プレビュー説明に表示） */
  format?: 'pdf' | 'ppt' | 'md';
  onClose: () => void;
  onDownload: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF（A4横）',
  ppt: 'PowerPoint（スライド形式）',
  md: 'Markdown（テキスト）',
};

const DOWNLOAD_BUTTON_LABELS: Record<string, string> = {
  pdf: 'PDFをダウンロード',
  ppt: 'PPTをダウンロード',
  md: 'Markdownをダウンロード',
};

export default function ReportPreview({
  sections,
  sessionName,
  companyName,
  userName,
  format = 'pdf',
  onClose,
  onDownload,
}: ReportPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalPages = sections.length + 1; // 表紙 + セクション数

  // プレビュー枠にA4横が収まるよう縮小率を計算
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateScale = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const scaleX = w / PAPER_WIDTH_PX;
      const scaleY = h / PAPER_HEIGHT_PX;
      const s = Math.min(scaleX, scaleY, 1);
      setScale(s);
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-900">📄 レポートプレビュー</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {FORMAT_LABELS[format] || 'PDF'}用のイメージです。下のボタンで選択中の形式（{FORMAT_LABELS[format] || 'PDF'}）でダウンロードできます。
              {format === 'md' && ' Markdownはテキスト形式で保存されます。'}
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* ページネーション */}
        <div className="flex items-center justify-center gap-4 p-3 border-b bg-gray-50">
          <Button
            onClick={prevPage}
            disabled={currentPage === 0}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            前へ
          </Button>
          <span className="text-sm font-medium text-gray-600">
            {currentPage + 1} / {totalPages}
          </span>
          <Button
            onClick={nextPage}
            disabled={currentPage === totalPages - 1}
            variant="outline"
            size="sm"
          >
            次へ
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* プレビューエリア（A4横を枠に収まるよう縮小表示） */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto p-4 bg-gray-100 min-h-0">
          <div
            style={{
              width: PAPER_WIDTH_PX * scale,
              height: PAPER_HEIGHT_PX * scale,
              position: 'relative',
              overflow: 'hidden',
            }}
            className="flex-shrink-0 rounded shadow-lg"
          >
            <div
              className="bg-white absolute left-0 top-0 report-preview-paper"
              style={{
                width: PAPER_WIDTH_PX,
                minHeight: PAPER_HEIGHT_PX,
                padding: '20mm',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <style>{`
                .report-preview-paper .report-header { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 12px 0; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%); color: #fff; border-radius: 0 0 8px 8px; margin: 0 -20mm 16px -20mm; padding-left: 20mm; padding-right: 20mm; font-size: 9.5pt; font-weight: 600; letter-spacing: 0.08em; }
                .report-preview-paper .report-header img { height: 20px; width: auto; vertical-align: middle; }
                .report-preview-paper .report-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 12px 0; background: linear-gradient(135deg, #3730a3 0%, #4f46e5 100%); color: rgba(255,255,255,0.95); font-size: 9pt; border-radius: 8px 8px 0 0; margin: 24px -20mm 0 -20mm; padding-left: 20mm; padding-right: 20mm; }
                .report-preview-paper .report-footer .page-number { font-weight: 600; }
                .report-preview-paper .report-footer .copyright { font-size: 8pt; opacity: 0.85; }
                .report-preview-paper .cover-page { min-height: 120px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px 0; position: relative; }
                .report-preview-paper .cover-page .cover-logo { position: absolute; top: 0; right: 0; display: flex; align-items: center; gap: 6px; color: #4f46e5; font-size: 9pt; font-weight: 600; letter-spacing: 0.06em; }
                .report-preview-paper .cover-page .cover-logo img { height: 22px; width: auto; }
                .report-preview-paper .cover-title { font-size: 28pt; font-weight: bold; color: #1e293b; margin-bottom: 16px; line-height: 1.3; }
                .report-preview-paper .cover-subtitle { font-size: 14pt; color: #64748b; margin-bottom: 32px; }
                .report-preview-paper .cover-meta { font-size: 11pt; color: #475569; text-align: center; line-height: 1.8; }
                .report-preview-paper .cover-meta .created { margin-bottom: 8px; }
                .report-preview-paper .cover-meta .author { margin-top: 16px; font-size: 10pt; color: #64748b; }
                .report-preview-paper .section { margin-top: 24px; padding-bottom: 32px; }
                .report-preview-paper .section-title { font-size: 16pt; font-weight: bold; color: #334155; border-bottom: 2px solid #6366f1; padding-bottom: 8px; margin-bottom: 16px; }
                .report-preview-paper .section-meta { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
                .report-preview-paper .report-body { font-size: 11pt; line-height: 1.7; color: #334155; }
                .report-preview-paper .report-body .report-heading { margin: 20px 0 10px 0; font-size: 14pt; font-weight: bold; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                .report-preview-paper .report-body .report-para { margin: 0 0 14px 0; }
                .report-preview-paper .report-body .report-list { margin: 0 0 14px 0; padding-left: 24px; }
                .report-preview-paper .report-body ol.report-list { list-style-type: decimal; }
                .report-preview-paper .report-body ul.report-list { list-style-type: disc; }
                .report-preview-paper .chat-message { margin-bottom: 20px; padding: 12px; border-radius: 4px; }
                .report-preview-paper .chat-user { background-color: #f1f5f9; border-left: 4px solid #6366f1; }
                .report-preview-paper .chat-assistant { background-color: #fef3c7; border-left: 4px solid #f59e0b; }
                .report-preview-paper .chat-role { font-weight: bold; font-size: 10pt; color: #64748b; margin-bottom: 4px; }
                .report-preview-paper .chat-content { font-size: 11pt; line-height: 1.6; }
                .report-preview-paper .report-table-wrap { overflow-x: auto; margin: 16px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
                .report-preview-paper .report-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
                .report-preview-paper .report-table th, .report-preview-paper .report-table td { border: 1px solid #e2e8f0; padding: 12px 14px; text-align: left; }
                .report-preview-paper .report-table th { background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%); color: #fff; font-weight: 600; }
                .report-preview-paper .report-table tr:nth-child(even) td { background: #f8fafc; }
                .report-preview-paper .swot-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .report-preview-paper .swot-table th, .report-preview-paper .swot-table td { border: 1px solid #e2e8f0; padding: 12px 14px; }
                .report-preview-paper .swot-table th { background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%); color: #fff; font-weight: 600; }
              `}</style>
              {currentPage === 0 ? (
                <CoverPage sessionName={sessionName} companyName={companyName} userName={userName} sections={sections} />
              ) : (
                <>
                  <header className="report-header">
                    <span>SOLVE WISE</span>
                    <img src="/logo.png" alt="" />
                  </header>
                  <SectionPage section={sections[currentPage - 1]} />
                  <footer className="report-footer">
                    <span className="page-number">{currentPage} / {totalPages}</span>
                    <span>AI参謀 - AI経営コンサルティング</span>
                    <span className="copyright">© 2026 SOLVE WISE</span>
                  </footer>
                </>
              )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <Button onClick={onClose} variant="outline">
            閉じる
          </Button>
          <Button onClick={onDownload} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            {DOWNLOAD_BUTTON_LABELS[format] ?? 'PDFをダウンロード'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * 表紙ページ（サンプルHTML体裁: ロゴ・表題・作成日時・文責）
 */
function CoverPage({
  sessionName,
  companyName,
  userName,
  sections,
}: {
  sessionName: string;
  companyName?: string;
  userName?: string;
  sections: ReportSection[];
}) {
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const reportTitle = sections[0]?.title ?? 'AI経営コンサルティング';

  return (
    <div className="cover-page">
      <div className="cover-logo">
        <img src="/logo.png" alt="SOLVE WISE" />
        <span>SOLVE WISE</span>
      </div>
      <div className="cover-title">{reportTitle}</div>
      <div className="cover-subtitle">{sessionName}</div>
      <div className="cover-meta">
        <div className="created">作成日時: {today}</div>
        {userName && <>担当: {userName}<br /></>}
        <div className="author">文責: AI参謀 - AI経営コンサルティング</div>
      </div>
    </div>
  );
}

/**
 * セクションページ（PDFと同じクラス名・構造でレイアウト統一）
 */
function SectionPage({ section }: { section: ReportSection }) {
  const createdAt = section.metadata?.createdAt
    ? new Date(section.metadata.createdAt).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="section">
      <h2 className="section-title">{section.title}</h2>
      {section.type === 'html' && createdAt && (
        <p className="section-meta">作成日時: {createdAt}</p>
      )}
      {section.type === 'chat' && <ChatSection section={section} />}
      {section.type === 'table' && <TableSection section={section} />}
      {section.type === 'list' && <ListSection section={section} />}
      {section.type === 'text' && <TextSection section={section} />}
      {section.type === 'html' && <HtmlSection section={section} />}
    </div>
  );
}

/**
 * 会話セクション（PDFと同じクラス名）
 */
function ChatSection({ section }: { section: ReportSection }) {
  const chatData = section.content as ChatData;

  return (
    <div>
      {chatData.messages.map((msg, index) => (
        <div
          key={index}
          className={`chat-message ${msg.role === 'user' ? 'chat-user' : 'chat-assistant'}`}
        >
          <div className="chat-role">{msg.role === 'user' ? 'ユーザー' : 'AI'}</div>
          <div className="chat-content" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * テーブルセクション（PDFと同じクラス名）
 */
function TableSection({ section }: { section: ReportSection }) {
  const tableData = section.content as TableData;

  return (
    <table className="swot-table">
      <thead>
        <tr>
          {tableData.headers.map((header, i) => (
            <th key={i}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tableData.rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={{ whiteSpace: 'pre-wrap', verticalAlign: 'top' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * リストセクション（PDFと同じ report-body 内リスト）
 */
function ListSection({ section }: { section: ReportSection }) {
  const listData = section.content as ListData;

  return (
    <div className="report-body">
      <ul className="report-list">
        {listData.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * テキストセクション（PDFと同じ report-body）
 */
function TextSection({ section }: { section: ReportSection }) {
  const content = section.content as string;

  return (
    <div className="report-body report-para" style={{ whiteSpace: 'pre-wrap' }}>
      {content}
    </div>
  );
}

/**
 * レポート用HTMLセクション（PDFと同じ report-body クラス。作成日時があれば表示）
 */
function HtmlSection({ section }: { section: ReportSection }) {
  const htmlContent = section.content as string;
  const createdAt = section.metadata?.createdAt
    ? new Date(section.metadata.createdAt).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div>
      {createdAt && (
        <p className="section-meta text-[10pt] text-gray-500 mb-2">作成日時: {createdAt}</p>
      )}
      <div
        className="report-body"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
