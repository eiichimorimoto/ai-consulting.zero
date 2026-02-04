# 🎨 Design: Start画面リファクタリング Phase 3（コンポーネント分割）

> **作成日**: 2026-02-04  
> **Phase**: Phase 3（UIコンポーネント分割）  
> **目標**: page.tsx を 795行 → 300行に削減（-62%）

---

## プロジェクトコンテキスト

### 技術スタック
- **フロントエンド**: Next.js 16 + TypeScript + Turbopack
- **UI**: React + カスタムコンポーネント
- **状態管理**: カスタムhook（Phase 2で作成済み）
- **スタイリング**: Tailwind CSS

### ファイル保護レベル
- **page.tsx**: レベル3（変更可能、ただし1ファイルずつ、承認後）
- **新規コンポーネント**: レベル3（新規作成）

### Phase 2完了状態
- page.tsx: **795行**
- カスタムhook: useConsultingSession, useMessageHandlers, useFileAttachment
- コンパイル時間: **2-27ms**

---

## Phase 3の目標

### パフォーマンス目標

| 指標 | Phase 2完了 | Phase 3目標 | 達成基準 |
|------|------------|------------|---------|
| 総行数 | 795行 | 300行 | -495行削減 |
| page.tsx | 795行 | 300行 | -62%削減 |
| コンパイル時間 | 2-27ms | さらに短縮 | 維持または改善 |
| 保守性 | 高 | 非常に高 | コンポーネント化完了 |

### 品質目標
- ✅ 各コンポーネントが単一責務を持つ
- ✅ コンポーネント単位でテスト可能
- ✅ 他の画面でも再利用可能
- ✅ Props が明確に定義されている

---

## アーキテクチャ設計

### Phase 3完了後の構造

```
app/consulting/start/page.tsx (300行)
├─ レイアウト構造のみ（3カラム）
├─ カスタムhook呼び出し
└─ コンポーネント配置

components/consulting/
├─ ChatArea.tsx (157行)
│  ├─ ヘッダー（現在のステップ、AI応答中バッジ）
│  └─ メッセージ表示（ユーザー/AIバブル、インタラクティブボタン）
│
├─ SessionDialogs.tsx (87行)
│  ├─ Step Navigation Dialog
│  └─ End Session Dialog
│
└─ MessageInputArea.tsx (116行)
   ├─ 添付ファイル表示
   ├─ 音声入力インジケーター
   └─ 入力エリア（Textarea、ボタン群）

hooks/ (Phase 2で作成済み)
├─ useConsultingSession.ts
├─ useMessageHandlers.ts
└─ useFileAttachment.ts
```

---

## モジュール設計

### 1. ChatArea.tsx

**責務**: チャットメッセージの表示とインタラクティブUI

**エクスポート**:
```typescript
export interface ChatAreaProps {
  currentSession: SessionData | null;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  onQuickReply: (reply: string, isCategory?: boolean) => void;
}

export default function ChatArea({ 
  currentSession, 
  chatScrollRef, 
  onQuickReply 
}: ChatAreaProps): JSX.Element;
```

**主な機能**:
- ヘッダー表示（現在のステップタイトル、AI応答中バッジ）
- メッセージリストレンダリング
- ユーザー/AIメッセージバブル
- インタラクティブボタン（カテゴリ、サブカテゴリ、カスタム入力、フォーム）
- タイムスタンプ表示

**依存**:
- types/consulting.ts（SessionData, Message等）
- lib/consulting/constants.ts（CHAT, BUTTON）
- components/ui/**（Badge, Button, Card, Input等）
- lucide-react（アイコン）

**抽出元**: app/consulting/start/page.tsx 504-661行

**保護レベル**: レベル3（新規作成）

---

### 2. SessionDialogs.tsx

**責務**: 確認ダイアログ群の表示と管理

**エクスポート**:
```typescript
export interface SessionDialogsProps {
  // Step Navigation Dialog
  stepToNavigate: number | null;
  onCancelStepNavigation: () => void;
  onConfirmStepNavigation: () => void;
  
  // End Session Dialog
  isEndingSession: boolean;
  endSessionStatus: SessionStatus;
  onSetIsEndingSession: (value: boolean) => void;
  onSetEndSessionStatus: (status: SessionStatus) => void;
  onConfirmEndSession: () => void;
}

export default function SessionDialogs(props: SessionDialogsProps): JSX.Element;
```

**主な機能**:
- Step Navigation Confirmation Dialog
  - ステップに戻る確認
  - キャンセル/戻るボタン
- End Session Confirmation Dialog
  - セッション終了確認
  - ステータス選択（一時中断/完了/中止）
  - キャンセル/終了するボタン

**依存**:
- types/consulting.ts（SessionStatus）
- components/ui/alert-dialog.tsx（AlertDialog関連）

**抽出元**: app/consulting/start/page.tsx 299-386行

**保護レベル**: レベル3（新規作成）

---

### 3. MessageInputArea.tsx

**責務**: メッセージ入力エリアの表示と管理

**エクスポート**:
```typescript
export interface MessageInputAreaProps {
  // 入力値
  inputValue: string;
  setInputValue: (value: string) => void;
  
  // ファイル添付
  attachedFiles: File[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileAttach: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  
  // 音声入力
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  enableAICorrection: boolean;
  setEnableAICorrection: (value: boolean) => void;
  
  // メッセージ送信
  onSendMessage: () => void;
}

export default function MessageInputArea(props: MessageInputAreaProps): JSX.Element;
```

**主な機能**:
- 添付ファイル表示（削除ボタン付き）
- 音声入力インジケーター（録音中アニメーション、停止ボタン）
- テキストエリア（リサイズ可能）
- ファイル添付ボタン
- 音声入力ボタン（Mic/MicOff切り替え）
- VoiceSettingsDialog
- 送信ボタン

**依存**:
- components/ui/**（Button, Textarea, Tooltip等）
- components/consulting/VoiceSettingsDialog.tsx
- lucide-react（アイコン）
- sonner（toast）
- lib/consulting-ui-tokens.ts（BUTTON）

**抽出元**: app/consulting/start/page.tsx 663-779行

**保護レベル**: レベル3（新規作成）

---

## データフロー

### Phase 3でのデータフロー

```
page.tsx
├─ useConsultingSession() → session
├─ useMessageHandlers() → message
├─ useFileAttachment() → file
└─ useVoiceInput() → voice
   ↓ Props として渡す
   ├─ ChatArea（session.currentSession, message.handleQuickReply）
   ├─ SessionDialogs（session.*）
   └─ MessageInputArea（message.*, file.*, voice.*）
```

### コンポーネント間の通信
- **page.tsx**: 状態管理とコンポーネント配置のみ
- **各コンポーネント**: Props経由でデータ受け取り、コールバック経由でイベント通知
- **hook**: ビジネスロジックと状態管理（Phase 2で完成）

---

## 技術選定（プロジェクト制約考慮）

### コンポーネント分割方針

| カテゴリ | 選定技術 | 理由 | 制約 |
|---------|---------|------|------|
| コンポーネント定義 | 関数コンポーネント | Next.js 16標準 | Server/Client Component考慮 |
| Props定義 | TypeScript Interface | 型安全性 | export必須 |
| スタイリング | Tailwind CSS | 既存統一 | クラス名そのまま移行 |
| イベント処理 | コールバックProps | 標準パターン | 親コンポーネントで状態管理 |

### コンポーネント作成の原則
1. **単一責務**: 1コンポーネント = 1つの明確な責務
2. **再利用性**: 他の画面でも使える汎用性
3. **テスタビリティ**: Props経由でモック可能
4. **型安全性**: すべてのPropsに型定義

---

## セキュリティ考慮点

### Phase 3での注意事項
1. **XSS対策**: ユーザー入力は既存コンポーネント（Textarea等）を使用
2. **ファイルアップロード**: 既存のfile.handleFileAttachをそのまま使用
3. **環境変数**: コンポーネントでは直接参照しない（親から渡す）

---

## ファイル変更計画

### 新規作成（3ファイル）

#### components/consulting/ChatArea.tsx
- **目的**: チャットメッセージ表示
- **行数**: 約157行
- **抽出元**: page.tsx 504-661行
- **依存**: types/consulting, components/ui/*, lucide-react
- **優先度**: 高
- **保護レベル**: レベル3

#### components/consulting/SessionDialogs.tsx
- **目的**: 確認ダイアログ群
- **行数**: 約87行
- **抽出元**: page.tsx 299-386行
- **依存**: types/consulting, components/ui/alert-dialog
- **優先度**: 高
- **保護レベル**: レベル3

#### components/consulting/MessageInputArea.tsx
- **目的**: メッセージ入力エリア
- **行数**: 約116行
- **抽出元**: page.tsx 663-779行
- **依存**: components/ui/*, components/consulting/VoiceSettingsDialog, sonner
- **優先度**: 高
- **保護レベル**: レベル3

---

### 変更対象（1ファイル）

#### app/consulting/start/page.tsx
- **変更内容**:
  - コンポーネントインポート追加（3つ）
  - JSX内の該当箇所をコンポーネントタグに置き換え
  - 不要なJSXコード削除（360行削減）
- **削減**: 795行 → 300行（-495行）
- **リスク**: 中（メインファイルの変更だが、Phase 2で安定化済み）
- **保護レベル**: レベル3

---

## リスク管理

### Phase 3のリスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| コンポーネント分割時のProps漏れ | 中 | TypeScriptでコンパイルエラー検出 |
| イベントハンドラーの接続ミス | 中 | 1ファイルずつ動作確認 |
| JSX構文エラー | 高 | タグカウント2-3回実施 |
| インポート漏れ | 低 | TypeScriptで検出可能 |
| スタイル崩れ | 低 | クラス名そのまま移行 |

### 対策の実施
- ✅ 1コンポーネントずつ作成・テスト
- ✅ page.tsx変更は最後に実施
- ✅ 各ステップで動作確認
- ✅ JSXタグカウント必須実施

---

## パフォーマンス目標

### Phase 3の目標値

| 指標 | Phase 2完了 | Phase 3目標 | 達成基準 |
|------|------------|------------|---------|
| 総行数 | 795行 | 300行 | -495行削減 |
| page.tsx | 795行 | 300行 | -62%削減 |
| コンパイル時間 | 2-27ms | 維持または改善 | 50ms以下 |
| 保守性 | 高 | 非常に高 | 完全なコンポーネント化 |
| テスタビリティ | 中 | 高 | コンポーネント単位でテスト可能 |

---

## 次のステップ

### Design完了後（Plan フェーズへ）

1. **タスク分解**
   - 各コンポーネント作成のタスク化
   - page.tsx変更のタスク化
   - 依存関係の明確化

2. **実装順序の決定**
   - SessionDialogs（最もシンプル）
   - MessageInputArea（中程度）
   - ChatArea（最も複雑）
   - page.tsx統合

3. **テスト戦略**
   - 各コンポーネント作成後に動作確認
   - 統合後の全機能テスト

---

**次のアクション**: Planフェーズへ移行し、実装タスクを詳細化する
