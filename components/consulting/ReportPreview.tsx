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
  onClose: () => void;
  onDownload: () => void;
}

export default function ReportPreview({
  sections,
  sessionName,
  companyName,
  userName,
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
            <p className="text-xs text-gray-500 mt-0.5">この内容でレポートをダウンロードできます（A4横）</p>
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
              className="bg-white absolute left-0 top-0"
              style={{
                width: PAPER_WIDTH_PX,
                minHeight: PAPER_HEIGHT_PX,
                padding: '20mm',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              {currentPage === 0 ? (
                <CoverPage sessionName={sessionName} companyName={companyName} userName={userName} />
              ) : (
                <SectionPage section={sections[currentPage - 1]} />
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
            PDFをダウンロード
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * 表紙ページ
 */
function CoverPage({
  sessionName,
  companyName,
  userName,
}: {
  sessionName: string;
  companyName?: string;
  userName?: string;
}) {
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="h-full flex flex-col justify-center items-center text-center">
      <h1 className="text-5xl font-bold text-indigo-600 mb-6">
        AI経営コンサルティング
      </h1>
      <h2 className="text-3xl text-gray-600 mb-12">
        {sessionName}
      </h2>
      <div className="text-base text-gray-500 space-y-2">
        {companyName && <p>{companyName}</p>}
        {userName && <p>担当: {userName}</p>}
        <p>作成日: {today}</p>
      </div>
    </div>
  );
}

/**
 * セクションページ
 */
function SectionPage({ section }: { section: ReportSection }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-indigo-600 border-b-2 border-indigo-600 pb-2 mb-6">
        {section.title}
      </h2>
      <div className="space-y-4">
        {section.type === 'chat' && <ChatSection section={section} />}
        {section.type === 'table' && <TableSection section={section} />}
        {section.type === 'list' && <ListSection section={section} />}
        {section.type === 'text' && <TextSection section={section} />}
        {section.type === 'html' && <HtmlSection section={section} />}
      </div>
    </div>
  );
}

/**
 * 会話セクション
 */
function ChatSection({ section }: { section: ReportSection }) {
  const chatData = section.content as ChatData;

  return (
    <div className="space-y-4">
      {chatData.messages.map((msg, index) => (
        <div
          key={index}
          className={`p-3 rounded ${
            msg.role === 'user'
              ? 'bg-gray-100 border-l-4 border-indigo-600'
              : 'bg-yellow-50 border-l-4 border-amber-500'
          }`}
        >
          <div className="text-xs font-bold text-gray-500 mb-1">
            {msg.role === 'user' ? 'ユーザー' : 'AI'}
          </div>
          <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * テーブルセクション
 */
function TableSection({ section }: { section: ReportSection }) {
  const tableData = section.content as TableData;

  return (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-indigo-600 text-white">
          {tableData.headers.map((header, i) => (
            <th key={i} className="border border-gray-300 p-3 text-left font-bold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tableData.rows.map((row, i) => (
          <tr key={i} className="bg-gray-50">
            {row.map((cell, j) => (
              <td key={j} className="border border-gray-300 p-3 text-sm whitespace-pre-wrap align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * リストセクション
 */
function ListSection({ section }: { section: ReportSection }) {
  const listData = section.content as ListData;

  return (
    <ul className="space-y-2">
      {listData.items.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className="text-indigo-600 font-bold mt-1">•</span>
          <span className="text-sm flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * テキストセクション
 */
function TextSection({ section }: { section: ReportSection }) {
  const content = section.content as string;

  return (
    <div className="text-sm whitespace-pre-wrap">
      {content}
    </div>
  );
}

/**
 * レポート用HTMLセクション（Dify提示コンテンツ成型済み）
 */
function HtmlSection({ section }: { section: ReportSection }) {
  const htmlContent = section.content as string;

  return (
    <div
      className="report-body text-sm prose prose-sm max-w-none [&_.report-heading]:text-base [&_.report-heading]:font-bold [&_.report-para]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
