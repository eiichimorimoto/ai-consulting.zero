/**
 * 相談画面 UI 標準（添付画像準拠）
 * タブ・ステータス・左エリア・右エリア・チャット・ボタン色を一元定義
 */

// タブ
export const TAB = {
  /** アクティブタブ: 黒塗りではなく、下に太い緑線 */
  active: "bg-gray-100 text-gray-900 border-b-4 border-green-500 rounded-t-lg",
  /** 非アクティブタブ */
  inactive: "bg-white text-gray-700 border border-gray-200 rounded-t-lg hover:bg-gray-50",
  inactivePaused: "bg-amber-50 text-gray-800 border border-amber-200 rounded-t-lg hover:bg-amber-100",
  inactiveCompleted: "bg-amber-50 text-gray-800 border border-amber-200 rounded-t-lg hover:bg-amber-100",
  inactiveCancelled: "bg-gray-100 text-gray-500 border border-gray-200 rounded-t-lg hover:bg-gray-200",
  /** タブ内進捗バー: 必ず見える高さ・緑 */
  progressTrack: "h-2 w-full rounded-full bg-gray-200",
  progressIndicator: "bg-green-500",
} as const;

// 左エリア ステータス
export const STEP_STATUS = {
  /** 完了: 白背景・栗文字（左パート進捗表示） */
  completedBadge: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-[#5C4033] shadow-sm dark:bg-white dark:text-[#5C4033] dark:border-gray-200",
  /** 進行中: 明るい緑背景・白文字 */
  activeBadge: "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-500 text-white",
  /** 完了ステップのアイコン色 */
  completedIcon: "text-green-500",
  /** 中断など（未使用時はグレー） */
  pendingIcon: "text-slate-500",
} as const;

// ステータスアイコン（タブ・履歴で使用）
export const STATUS_ICON = {
  paused: "text-amber-500",      // 一時中断
  completed: "text-green-600",   // 完了
  cancelled: "text-gray-500",    // 中止
  active: "text-green-500",      // 進行中
} as const;

// ユーザー吹き出し（薄い背景・見やすい文字色）
export const CHAT = {
  userBubble: "bg-green-100 border border-green-200 text-green-900",
  aiBubble: "bg-white text-gray-900 border border-gray-200 shadow-sm",
} as const;

// 右エリア
export const RIGHT_PANEL = {
  base: "bg-white border-gray-200",
  /** 注意を引くブロック（初期インサイト等） */
  highlightBlock: "bg-gray-50 border border-gray-200 rounded-lg",
  accentBlock: "bg-green-50/80 border border-green-200 rounded-lg",
} as const;

// ボタン標準
export const BUTTON = {
  primary: "bg-green-600 hover:bg-green-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  secondary: "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50",
  /** 左エリア用: 白背景・黒文字（レポートをエクスポート等） */
  leftPanel: "bg-white text-black border border-gray-300 hover:bg-gray-100",
  /** 履歴・新規などタブ横のアクション：見やすい枠付き */
  tabAction: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium",
} as const;
