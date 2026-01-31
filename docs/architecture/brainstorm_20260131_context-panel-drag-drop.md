# 🧠 Brainstorm: ContextPanel ドラッグ&ドロップ機能追加

**作成日時**: 2026-01-31
**機能名**: 添付ファイルエリアへのドラッグ&ドロップ機能追加とエラーメッセージ表示

---

## プロジェクトコンテキスト

- **技術スタック**: Next.js 16 + TypeScript + Supabase
- **ファイル保護レベル**: レベル3（変更可能）
- **関連ファイル**:
  - `app/consulting/components/ContextPanel.tsx`（メイン変更対象）
  - `app/consulting/start/page.tsx`（Props追加）
  - `lib/file-processing/text-extractor.ts`（既存：検証ロジック参照）

---

## 要件サマリー

ユーザーから以下の要望：
1. **ContextPanel（右パネル）の添付ファイルエリアにドラッグ&ドロップ機能を追加**
2. **ファイル添付時のエラーメッセージ表示を実装**
   - ファイルサイズ超過（10MB）
   - 非対応形式
   - その他のエラー

---

## 現状分析

### 現在の実装
1. **ContextPanel.tsx（134-176行目）**:
   - 添付ファイルの表示のみ
   - 削除ボタンあり（`onRemoveAttachment`）
   - ドラッグ&ドロップ機能なし

2. **start/page.tsx（199-217行目）**:
   - `handleFileUpload`関数でファイル処理
   - `InitialIssueModal`と`MessageInput`からのみ呼び出し
   - ContextPanelには`onFileUpload`が渡されていない

3. **既存の検証ロジック**:
   - `InitialIssueModal.tsx`（79-109行目）
   - `MessageInput.tsx`（81-111行目）
   - MIMEタイプと拡張子の両方で検証
   - ファイルサイズ10MB制限

### 技術的制約
- ブラウザのFile APIを使用
- 既存の`handleFileUpload`関数との統合
- エラーメッセージはReact state管理

---

## 逆質問リスト

### 1. 機能要件
- ❓ ドラッグオーバー時のUI表示はどうするか？
  - 回答: 既存コンポーネント（InitialIssueModal等）を参考に、破線枠とテキスト表示
- ❓ 複数ファイルの同時ドロップに対応するか？
  - 回答: はい（既存の`handleFileUpload`が対応済み）

### 2. エラーメッセージ
- ❓ エラーメッセージの表示場所は？
  - 回答: 添付ファイルエリア内にトースト風表示（3-5秒で自動消去）
- ❓ エラーメッセージの種類は？
  - ファイルサイズ超過
  - 非対応形式
  - その他のエラー（ネットワーク等）

### 3. UI/UX
- ❓ 「ファイルをドロップまたはクリック」のテキストを表示するか？
  - 回答: はい（添付ファイルが0件の場合）
- ❓ ドラッグ中のビジュアルフィードバックは？
  - 回答: 背景色変更、破線枠表示

### 4. セキュリティ
- ❓ 既存の検証ロジックを再利用するか？
  - 回答: はい（MIMEタイプ+拡張子の二重検証）

---

## 確定要件

1. **ドラッグ&ドロップ機能**
   - ContextPanelの添付ファイルエリアにドラッグ&ドロップ可能に
   - 複数ファイルの同時ドロップに対応
   - クリックでもファイル選択可能（`<input type="file">`を隠す）

2. **エラーメッセージ表示**
   - エラー種類:
     - ファイルサイズ超過（10MB）
     - 非対応形式（.txt, .csv, .md, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx以外）
     - その他のエラー
   - 表示方法: 添付ファイルエリア内にトースト風表示（3-5秒で自動消去）
   - エラー時は該当ファイルを添付しない

3. **UI/UX**
   - ドラッグオーバー時: 背景色変更、破線枠表示
   - 添付ファイル0件時: 「ファイルをドロップまたはクリック」テキスト表示
   - ドロップ禁止エリア（他の部分）では視覚的フィードバックなし

4. **検証ロジック**
   - 既存の検証ロジックを再利用
   - MIMEタイプと拡張子の両方でチェック
   - ファイルサイズ10MB制限

---

## スコープ外

- ContextPanel以外のコンポーネントへのドラッグ&ドロップ追加
- ファイルサイズ制限の変更
- 対応ファイル形式の追加
- ファイルプレビュー機能

---

## ファイル影響範囲

### 変更対象
- `app/consulting/components/ContextPanel.tsx`（メイン変更）
  - ドラッグ&ドロップイベントハンドラ追加
  - エラーメッセージ表示UI追加
  - 隠し`<input type="file">`追加
- `app/consulting/start/page.tsx`
  - `ContextPanel`に`onFileUpload` Propsを追加

### 参照のみ
- `app/consulting/components/InitialIssueModal.tsx`（検証ロジック参照）
- `app/consulting/components/MessageInput.tsx`（検証ロジック参照）
- `lib/file-processing/text-extractor.ts`（MIMEタイプリスト参照）

### 保護レベル確認
- すべて**レベル3**（変更可能）

---

## 技術的考慮事項

1. **React Hooks**
   - `useState`: エラーメッセージ、ドラッグ状態管理
   - `useRef`: 隠し`<input>`要素の参照
   - `useEffect`: エラーメッセージの自動消去タイマー

2. **イベントハンドラ**
   - `onDragOver`: ブラウザのデフォルト動作を防止
   - `onDrop`: ファイルを取得して検証
   - `onDragEnter`, `onDragLeave`: 視覚的フィードバック

3. **ファイル検証**
   - 既存の検証ロジックと同じ
   ```typescript
   const allowedTypes = ['text/plain', 'text/csv', 'application/csv', 'text/markdown', 'application/pdf', ...]
   const allowedExtensions = ['.txt', '.csv', '.md', '.pdf', '.doc', '.docx', ...]
   const hasValidMimeType = allowedTypes.includes(file.type)
   const hasValidExtension = allowedExtensions.includes(ext)
   return hasValidMimeType || hasValidExtension
   ```

4. **エラーメッセージ型定義**
   ```typescript
   interface ErrorMessage {
     type: 'error' | 'warning' | 'info'
     message: string
     timestamp: number
   }
   ```

---

## 次のステップ

1. **Design（設計）フェーズ**へ進む
2. UI/UXの詳細設計
3. コンポーネント構造の設計
4. イベントフローの設計
