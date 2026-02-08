# 📝 Implementation Plan: レポートフォーム実装

**日付**: 2026-02-09  
**参照**: design_20260209_report_form_implementation.md

---

## タスク一覧

### Task 1: 型定義の拡張（lib/report/types.ts）

- **目的**: PDF 用の orientation / authorLabel を型で受け付ける。
- **変更**: `PDFGenerateOptions` に `orientation?: 'portrait' | 'landscape'`, `authorLabel?: string`, `baseUrl?: string` を追加。
- **依存**: なし  
- **保護レベル**: 3

### Task 2: PDF 生成のレポートフォーム化（lib/report/pdf-generator.ts）

- **目的**: サンプル HTML に合わせた表紙・ヘッダー・フッター・表スタイル・用紙向きを実装。
- **変更**:
  - `generateReportHTML`: 表紙（cover-logo, cover-title, cover-subtitle, cover-meta）、`@page` の orientation 対応、本文はセクションのみ（ヘッダー・フッターは Puppeteer displayHeaderFooter で出力）。
  - または HTML 内に .report-header / .report-footer を各ページ相当で持たせず、displayHeaderFooter + headerTemplate/footerTemplate でヘッダー・フッターを付与。その場合、ロゴは baseUrl を使って headerTemplate に `<img src="${baseUrl}/logo.png">`。
  - 表: generateTableHTML を .report-table-wrap / .report-table とサンプルと同じスタイルに変更。
  - page.pdf() に landscape: options.orientation !== 'portrait' を渡す。
- **依存**: Task 1  
- **保護レベル**: 3

### Task 3: generate-report API の拡張（app/api/tools/generate-report/route.ts）

- **目的**: リクエストから orientation / authorLabel / baseUrl を受け、generatePDFReport に渡す。baseUrl は request.nextUrl.origin を使用（クライアントからは送らない）。
- **変更**: body から orientation, authorLabel を読み、baseUrl = request.nextUrl.origin で generatePDFReport に渡す。
- **依存**: Task 2  
- **保護レベル**: 2（変更通知する）

### Task 4: ExportDialog に用紙の向きを追加（components/consulting/ExportDialog.tsx）

- **目的**: PDF 選択時のみ「用紙の向き: 横 / 縦」を表示し、ダウンロード時に orientation と authorLabel を API に送る。
- **変更**: state `orientation: 'landscape' | 'portrait'`（デフォルト landscape）、PDF 時のみ UI 表示、downloadPDF の body に orientation と authorLabel を追加。
- **依存**: Task 3  
- **保護レベル**: 3

---

## 実装順序

1. Task 1 → コミット or 確認  
2. Task 2 → 動作確認（既存 PDF エクスポートがフォーム体裁で出るか）  
3. Task 3 → 変更通知の上で実施  
4. Task 4 → 動作確認  

---

## 注意

- 1 ファイルずつ変更。Task 2 は行数が多いため、変更箇所を明確にしたうえで実施する。
- ロゴは headerTemplate で baseUrl を使用。開発時は localhost、本番は Vercel の origin。
