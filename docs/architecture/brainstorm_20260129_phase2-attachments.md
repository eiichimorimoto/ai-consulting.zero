# 🧠 Brainstorm: Phase 2 - 添付ファイル対応

## プロジェクトコンテキスト
- **技術スタック**: Next.js 16 + TypeScript + Supabase
- **ファイル保護レベル**: レベル3（新規実装）
- **前提条件**: Phase 1完了（`/api/dify/context`拡張済み）

---

## 要件サマリー

新規相談開始時に、ユーザーが添付したファイルをDifyに送信できるようにする。

### 現状の実装状況

#### ✅ 既に実装済み
1. **UIコンポーネント**: `InitialIssueModal`に添付ボタンあり
2. **ファイル選択**: `handleFileUpload`関数でファイルをクライアント側メモリに保存
3. **ファイルタイプ制限**: `.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt`
4. **プレビュー**: `URL.createObjectURL`で表示可能

#### ❌ 未実装
1. **サーバー側へのファイル送信**: `handleInitialIssueSubmit`で添付ファイルを含めていない
2. **ファイルの永続化**: Supabase Storageまたはデータベース
3. **ファイル内容の抽出**: テキスト/PDF/画像からの情報抽出
4. **Difyへの送信**: `/api/dify/context`で添付ファイル情報を返却

---

## 逆質問リスト

### 1. **ファイル保存方法**
**質問**: 添付ファイルはどこに保存しますか？

**選択肢**:
- **A. Supabase Storage**
  - メリット: ファイルバイナリを直接保存、大容量対応、CDN配信
  - デメリット: 追加設定が必要、ファイルURL管理
  
- **B. データベース（JSONB）**
  - メリット: 設定不要、トランザクション整合性
  - デメリット: サイズ制限（10MB推奨）、パフォーマンス

**推奨**: **A. Supabase Storage**
- 理由: 将来的に画像・大容量ファイル対応も見据えて

---

### 2. **ファイル内容の抽出**
**質問**: どのファイルタイプで内容を抽出しますか？

**選択肢**:
- **テキストファイル（.txt, .csv）**: そのまま読み取り ✅
- **PDFファイル（.pdf）**: OCR（既存の`lib/ocr/pdf-to-image-client.ts`使用）✅
- **Officeファイル（.doc, .docx, .xls, .xlsx）**: ライブラリ必要 ⚠️
- **画像ファイル**: 現在は対象外

**推奨**: **Phase 2.1ではテキストとPDFのみ対応**
- 理由: 既存のOCR機能を活用、Officeファイルは将来実装

---

### 3. **ファイルサイズ制限**
**質問**: ファイルサイズ制限はどこで実装しますか？

**選択肢**:
- **A. クライアント側（InitialIssueModal）**: ユーザー体験向上
- **B. サーバー側（APIルート）**: セキュリティ
- **C. 両方**: 推奨 ✅

**推奨**: **C. 両方**
- クライアント: ファイル選択時に警告
- サーバー: 10MB制限をNext.js `bodyParser`で設定

---

### 4. **セキュリティ考慮**
**質問**: ファイルアップロードのセキュリティ対策は？

**必須対策**:
- ✅ ファイルタイプ検証（MIMEタイプ確認）
- ✅ ファイルサイズ制限（10MB）
- ✅ ファイル名のサニタイズ（特殊文字削除）
- ⚠️ ウイルススキャン（将来実装）

---

### 5. **Difyへの送信形式**
**質問**: Difyに添付ファイルをどう送信しますか？

**選択肢**:
- **A. テキスト抽出結果のみ送信**: Difyの入力サイズ制限対応 ✅
- **B. ファイルURL送信**: Difyがダウンロード（要認証設定）
- **C. Base64エンコードで送信**: サイズ肥大化

**推奨**: **A. テキスト抽出結果のみ送信**
- 理由: Difyのコンテキスト制限（数千文字）に収まる

---

## 確定要件

### Phase 2.1: 基本実装

1. **ファイルアップロード処理**
   - クライアント側: `FormData`でファイル送信
   - サーバー側: Supabase Storageに保存
   - ファイルメタデータを`consulting_messages.attachments`（JSONB）に保存

2. **ファイル内容抽出**
   - テキストファイル（.txt, .csv）: そのまま読み取り
   - PDFファイル（.pdf）: 既存OCR機能使用

3. **サイズ・タイプ制限**
   - クライアント側: 選択時に検証
   - サーバー側: API Routeで再検証
   - 制限: 10MB、指定タイプのみ

4. **`/api/dify/context`拡張**
   - `getAttachments`関数を追加
   - レスポンスに`attachments`配列を追加
   - テキスト抽出結果を含める

---

## スコープ外（Phase 2.1）

- ❌ Officeファイル（.doc, .docx, .xls, .xlsx）の内容抽出
- ❌ 画像ファイルのOCR
- ❌ ウイルススキャン
- ❌ 添付ファイルの編集・削除機能

---

## ファイル影響範囲

### 新規作成
- `lib/storage/upload.ts`: Supabase Storageアップロード処理
- `lib/file-processing/text-extractor.ts`: テキスト抽出ユーティリティ

### 変更対象（レベル3）
- `app/consulting/start/page.tsx`: `handleInitialIssueSubmit`修正
- `app/consulting/components/InitialIssueModal.tsx`: ファイルサイズ検証追加
- `app/api/consulting/sessions/route.ts`: 添付ファイル処理追加
- `app/api/dify/context/route.ts`: `getAttachments`関数追加

### 参照のみ
- `lib/ocr/pdf-to-image-client.ts`: PDF処理
- `supabase/schema.sql`: `consulting_messages`テーブル構造確認

---

## 技術的課題と解決策

### 課題1: Next.js 16でのファイルアップロード
**課題**: App RouterのServer Actionsでファイル処理

**解決策**: 
- `NextRequest`の`formData()`メソッド使用
- `File` Web APIで処理

### 課題2: Supabase Storage設定
**課題**: Storageバケットの作成と権限設定

**解決策**:
- バケット名: `consulting-attachments`
- 権限: RLS有効、ユーザー自身のファイルのみアクセス可

### 課題3: 既存OCR機能との統合
**課題**: `lib/ocr/pdf-to-image-client.ts`はクライアント側実装

**解決策**:
- サーバー側用のPDF処理関数を新規作成
- または`pdf-parse`等のサーバー側ライブラリ使用

---

## 実装の優先順位

1. **高優先度** - Phase 2.1（必須）
   - ファイルアップロード基盤
   - テキストファイル対応
   - `/api/dify/context`拡張

2. **中優先度** - Phase 2.2（推奨）
   - PDFファイル対応
   - エラーハンドリング強化
   - テスト実装

3. **低優先度** - Phase 3以降
   - Officeファイル対応
   - 画像OCR
   - ウイルススキャン
