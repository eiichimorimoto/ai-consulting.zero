# 🧠 Brainstorm: レポートフォーム実装

**日付**: 2026-02-09  
**参照**: `public/report-form-sample.html`, `docs/architecture/design_20260209_report_output_form.md`

---

## プロジェクトコンテキスト

- 技術スタック: Next.js 16 + TypeScript + Supabase
- ファイル保護レベル: 変更対象は lib/report/*, components/consulting/ExportDialog, app/api/tools/generate-report（レベル2〜3）
- 関連: 既存 `lib/report/pdf-generator.ts` がPuppeteerでPDF生成、`ExportDialog` がセクション選択とAPI呼び出し

---

## 要件サマリー

ユーザー指示: 「先程のHTMLで作ったレポートフォームを実装してください。」

- **サンプル**: `public/report-form-sample.html` に以下が含まれる。
  - 表紙: 表題・サブタイトル・作成日時・担当・文責（SOLVE WISE ロゴ 9pt + 20px）
  - ヘッダー（全本文ページ）: インディゴ系グラデーション、SOLVE WISE テキスト + ロゴ右端
  - フッター: ページ番号（1/2）、文責、**© 2026 SOLVE WISE**
  - 用紙の向き: 横（A4 landscape）／縦（A4 portrait）を選択可能
  - 本文: セクションタイトル（下線）、section-meta（作成日時）、section-body
  - 表形式: `.report-table`（ヘッダーグラデーション・偶数行ストライプ）
  - プロセス図: `.process-flow` + `.process-box` + 矢印
- **設計書**: 表題はDify先頭見出し or フォールバック、文責は「AI参謀 - AI経営コンサルティング」、縦/横はエクスポート時に選択。

---

## 確定要件

1. **PDFレイアウト**: サンプルHTMLに合わせて表紙・ヘッダー・フッター・Copyright を本番PDFに反映する。
2. **用紙の向き**: エクスポート形式がPDFのとき「横 / 縦」を選べるようにする（デフォルト横）。
3. **文責・表題**: メタデータで `authorLabel`（文責）、表題は既存 `metadata.title` を利用。
4. **表・プロセス図**: 既存の `type: 'table'` はサンプルと同じ `.report-table` スタイルで出力。本文中のリストで「手順・フロー」と判定できる場合はプロセス図として出力（優先度は中。まずは表のみサンプルスタイル適用で可）。
5. **ロゴ**: ヘッダー・表紙で `/logo.png` を参照（既存静的アセット前提）。

---

## スコープ外

- PPTの向き切り替え（設計書では別途）
- ユーザーが「表で」「図で」と明示したときの上書きUI（設計書では将来対応で可）
- ページ番号の CSS `counter(pages)` はPuppeteer側で総ページ数を渡す必要があるため、初回は「1 / N」を各ページで同じNでよいか、または footerTemplate で動的表示（要検討）

---

## ファイル影響範囲

| ファイル | 変更内容 | 保護レベル |
|----------|----------|------------|
| `lib/report/types.ts` | `PDFGenerateOptions` に `orientation`, `authorLabel` 追加 | 3 |
| `lib/report/pdf-generator.ts` | サンプルに合わせたHTML/CSS（表紙・ヘッダー・フッター・表スタイル）、orientation 対応 | 3 |
| `app/api/tools/generate-report/route.ts` | リクエストから orientation/authorLabel を受け取り渡す | 2 |
| `components/consulting/ExportDialog.tsx` | PDF選択時に「用紙の向き: 横/縦」を追加 | 3 |

---

## 実装順序（案）

1. 型定義（types.ts）
2. PDF生成（pdf-generator.ts）— 1ファイルのみ変更、動作確認
3. API（generate-report/route.ts）
4. ExportDialog（用紙の向き・authorLabel をAPIに渡す）
