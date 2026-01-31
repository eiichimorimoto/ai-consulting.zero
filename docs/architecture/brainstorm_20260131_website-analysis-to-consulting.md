# 🧠 Brainstorm: Webサイト分析結果を相談画面に添付

## プロジェクトコンテキスト
- 技術スタック: Next.js 16 + TypeScript + Supabase
- ファイル保護レベル: レベル3（新規作成・変更可能）
- 関連ファイル:
  - `app/dashboard/website-analysis/page.tsx`（レベル3）
  - `app/consulting/start/page.tsx`（レベル2 - 慎重）
  - `app/consulting/components/ContextPanel.tsx`（レベル3）

## 要件サマリー

ユーザーの要望:
> Webサイト分析ページ（`/dashboard/website-analysis`）の最下段にある「改善について相談する」ボタンのリンク先を`/consulting/start`に変更し、分析結果を添付ファイルとして相談画面の右ブロック（ContextPanel）に自動添付する。

## 逆質問リスト

### 1. 機能要件
- ✅ ボタンのリンク先: `/contact` → `/consulting/start`
- ✅ 診断結果の添付: 分析結果を添付ファイルとして追加
- ❓ **ファイル形式**: テキスト形式？JSON形式？PDF形式？
- ❓ **ファイル名**: どのような命名規則？（例: `website-analysis-{url}-{date}.txt`）
- ❓ **相談カテゴリ**: 自動的に特定カテゴリ（例: IT・デジタル化）を選択？

### 2. 技術整合性（Next.js/Supabase）
- ✅ sessionStorage経由でデータ受け渡し（FloatingDiagnosisと同様）
- ✅ Blob APIで仮想ファイル作成 → File化
- ✅ 既存の添付ファイル機能を活用

### 3. セキュリティ
- ✅ sessionStorageは同一オリジン制限あり（安全）
- ✅ 診断結果に機密情報は含まれない（公開URLのメトリクス）
- ✅ 環境変数の追加不要

### 4. ファイル影響
- 変更対象:
  - `app/dashboard/website-analysis/page.tsx`（ボタンリンク、sessionStorage保存）
  - `app/consulting/start/page.tsx`（sessionStorage読み込み、ファイル添付）
- 参照のみ:
  - `app/consulting/components/ContextPanel.tsx`（既存機能のまま）

### 5. パフォーマンス
- ✅ sessionStorageのサイズ制限: 5-10MB（診断結果は数KB程度）
- ✅ 相談画面の初回マウント時に1回だけ読み込み

### 6. スコープ
- やること:
  1. ボタンリンク変更
  2. 診断結果をsessionStorageに保存
  3. 相談画面で読み込み＆ファイル化
  4. 添付ファイルとして追加
- やらないこと:
  - PDF生成（複雑すぎる、Phase 2で検討）
  - Supabaseへの保存（不要）
  - 新しいAPI作成（不要）

## 回答サマリー

### ファイル形式の決定
**推奨**: マークダウン形式（`.md`）
- 理由: 人間が読みやすい、構造化された情報、軽量

### ファイル名規則
```
website-analysis-report-{timestamp}.md
例: website-analysis-report-20260131-095301.md
```

### 相談カテゴリ
- 自動選択しない（ユーザーが選択）
- ただし、診断結果添付済みの状態で初期ポップアップを開く

## 確定要件

1. **ボタンリンク変更**
   - `onClick={() => router.push('/contact')}` → `onClick={handleConsultAboutReport}`
   
2. **sessionStorageキー**
   - キー名: `website_analysis_result`
   - 有効期限: セッション内（タブを閉じるまで）
   
3. **データ構造**
   ```typescript
   {
     url: string
     overallScore: number
     topIssues: Array<{...}>
     metrics: {...}
     analyzedAt: string (ISO 8601)
   }
   ```

4. **マークダウンファイル生成**
   - ファイル名: `website-analysis-report-{timestamp}.md`
   - 内容: 診断結果をマークダウン形式に整形
   - サイズ: 約5-10KB

5. **相談画面での処理**
   - マウント時（`useEffect`）にsessionStorageをチェック
   - データがあればマークダウンファイルを生成
   - `attachmentFiles`と`contextData.attachments`に追加
   - sessionStorageをクリア（使用後）

## スコープ外

- ❌ PDF生成（別途Phase 2で実装）
- ❌ 診断履歴の保存（Supabase）
- ❌ 複数診断結果の比較機能
- ❌ 診断結果の編集機能

## ファイル影響範囲

### 変更対象
- `app/dashboard/website-analysis/page.tsx`:
  - `handleConsultAboutReport`関数を追加
  - ボタンの`onClick`を変更
  - sessionStorageに診断結果を保存
  - 保護レベル: 3（変更可能）

- `app/consulting/start/page.tsx`:
  - `useEffect`でsessionStorage読み込み
  - マークダウンファイル生成ロジック追加
  - 添付ファイルに追加
  - 保護レベル: 2（慎重に扱う - 変更前に影響範囲報告）

### 参照のみ
- `app/consulting/components/ContextPanel.tsx`: 既存機能をそのまま使用

## 技術スタック選定

| カテゴリ | 選定技術 | 理由 |
|---------|---------|------|
| データ受け渡し | sessionStorage | 一時的、同一オリジン、軽量 |
| ファイル生成 | Blob API + File API | ブラウザネイティブ、軽量、依存なし |
| フォーマット | Markdown (.md) | 可読性、軽量、構造化 |

## データフロー

```
1. Webサイト分析完了
   ↓
2. 「改善について相談する」ボタンクリック
   ↓
3. handleConsultAboutReport()
   - 診断結果をsessionStorageに保存
   - router.push('/consulting/start')
   ↓
4. 相談画面マウント
   ↓
5. useEffect実行
   - sessionStorageから診断結果を読み込み
   - マークダウンファイル生成
   - attachmentFilesに追加
   - sessionStorageクリア
   ↓
6. ContextPanelに表示
```

## リスク管理

| リスク | 対策 |
|--------|------|
| sessionStorageが空の場合 | エラーハンドリング、通常の相談フローへ |
| ファイル生成失敗 | try-catchでエラーキャッチ、コンソール警告 |
| 添付ファイル重複 | sessionStorage読み込み後すぐにクリア |
| page.tsxへの影響 | 最小限の変更、既存ロジックは触らない |
