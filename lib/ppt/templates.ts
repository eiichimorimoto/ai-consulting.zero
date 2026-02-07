/**
 * PPTテンプレート定義
 * プロトタイプ用の固定テンプレート
 */

export interface SlideContent {
  title: string;
  items?: string[];
  subtitle?: string;
}

/**
 * デフォルトテンプレート: 営業計画プレゼンテーション
 */
export const defaultTemplate: SlideContent[] = [
  {
    title: 'AI経営コンサルティング',
    subtitle: '営業計画プレゼンテーション',
  },
  {
    title: '営業計画の概要',
    items: [
      '目標売上: 1億円',
      '期間: 2026年度',
      '重点施策: 新規顧客開拓',
      'ターゲット: 中小企業',
    ],
  },
  {
    title: '主要アクション',
    items: [
      '見込み客リスト作成（200社）',
      '月次訪問計画策定（週5件訪問）',
      '提案資料の標準化',
      '営業チームの育成強化',
    ],
  },
];

/**
 * カラースキーム
 */
export const colors = {
  primary: '6366f1',      // インディゴ（既存UIと統一）
  secondary: '8b5cf6',    // パープル
  text: '1e293b',         // ダークグレー
  textLight: '64748b',    // ライトグレー
  background: 'ffffff',   // ホワイト
  accent: 'f1f5f9',       // ライトグレー背景
};
