/**
 * レポート生成の型定義
 */

import { Message } from '@/types/consulting';

/**
 * レポートセクションの種類
 */
export type SectionType = 'text' | 'table' | 'list' | 'chat';

/**
 * レポートセクションID
 */
export type SectionId = 
  | 'chat'           // 会話履歴
  | 'swot'           // SWOT分析
  | 'trends'         // 業界動向
  | 'market'         // 市場データ
  | 'recommendation' // 経営提言
  | 'forecast';      // 業界予測

/**
 * テーブルデータ（SWOT分析用）
 */
export interface TableData {
  headers: string[];
  rows: string[][];
}

/**
 * リストデータ（箇条書き用）
 */
export interface ListData {
  items: string[];
}

/**
 * チャットデータ（会話履歴用）
 */
export interface ChatData {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
}

/**
 * レポートセクション
 */
export interface ReportSection {
  id: SectionId;
  type: SectionType;
  title: string;
  content: string | TableData | ListData | ChatData;
  metadata?: {
    createdAt?: string;
    source?: string;
  };
}

/**
 * エクスポート設定
 */
export interface ExportConfig {
  sectionIds: SectionId[];
  format: 'pdf' | 'ppt';
  metadata: {
    sessionName: string;
    userName?: string;
    companyName?: string;
    createdAt?: string;
  };
}

/**
 * エクスポート可能なセクション情報
 */
export interface AvailableSection {
  id: SectionId;
  label: string;
  description: string;
  available: boolean;      // 該当データが存在するか
  messageCount?: number;   // メッセージ数（chatの場合）
}

/**
 * PDF生成オプション
 */
export interface PDFGenerateOptions {
  sections: ReportSection[];
  metadata: {
    title: string;
    sessionName: string;
    userName?: string;
    companyName?: string;
    createdAt: string;
  };
}

/**
 * PDF生成結果
 */
export interface PDFGenerateResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}
