# 🎨 Design: レポートフォーム実装

**日付**: 2026-02-09  
**参照**: brainstorm_20260209_report_form_implementation.md, report-form-sample.html

---

## 1. レイアウト構成（サンプル準拠）

```
┌─────────────────────────────────────────────────────────┐
│ 表紙（1ページ目）                                         │
│   [右上] SOLVE WISE + ロゴ 20px                           │
│   表題（metadata.title）                                  │
│   サブタイトル（metadata.sessionName）                     │
│   作成日時: YYYY年M月D日 HH:MM                            │
│   担当: {userName}                                        │
│   文責: {authorLabel}  ※ デフォルト "AI参謀 - AI経営コンサルティング" │
└─────────────────────────────────────────────────────────┘
                    page-break-after: always

┌─────────────────────────────────────────────────────────┐
│ ヘッダー（本文全ページ）                                   │
│   background: linear-gradient(135deg, #4f46e5 → #818cf8)  │
│   右端: SOLVE WISE (9.5pt) + logo 20px                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ セクション                                               │
│   .section-title (16pt, border-bottom #6366f1)           │
│   .section-meta (10pt, 作成日時)                         │
│   .section-body (11pt) or .report-table-wrap / .process-flow │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ フッター（全ページ）                                     │
│   background: linear-gradient(#3730a3 → #4f46e5)         │
│   ページ番号 | 文責 | © 2026 SOLVE WISE                  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 型の拡張（lib/report/types.ts）

- `PDFGenerateOptions.metadata` は既存のまま。
- `PDFGenerateOptions` に以下を追加:
  - `orientation?: 'portrait' | 'landscape'` — 未指定時は `'landscape'`
  - `authorLabel?: string` — 未指定時は `'AI参謀 - AI経営コンサルティング'`

---

## 3. PDF生成（lib/report/pdf-generator.ts）

- **generateReportHTML**: サンプルに合わせて以下に差し替え。
  - `@page { size: A4 landscape; margin: 20mm; }` および `body.portrait` 時は `size: A4 portrait`。
  - 表紙: `.cover-page`, `.cover-logo`, `.cover-title`, `.cover-subtitle`, `.cover-meta`。ロゴは `<img src="/logo.png">`（Puppeteerは request.nextUrl.origin でないため、絶対URLまたは data URL が必要。本番では同一オリジンで setContent するので `/logo.png` は相対でよいが、Puppeteer は file プロトコルになるため baseUrl を渡す必要あり。Next の API 内では `request.nextUrl.origin` で HTML に埋め込むか、ロゴを data URL で渡すか。設計書では「本番PDFは displayHeaderFooter」とあるが、サンプルは本文中に header/footer を書いているので、まずは本文中ヘッダー/フッターで実装し、ページ番号は各 .doc に「1/2」のように静的に入れるか、JS で総ページ数が分からないので「1」「2」のみにする。→ 総ページ数は Puppeteer の page.pdf 後に分からないので、HTML側では「ページ番号」を「1」だけ表示し、2ページ目は「2」と手で書くか、複数 .doc を連結する場合にセクションごとに doc を分けてページ番号をインクリメントする必要がある。サンプルでは .doc が2つあり、それぞれフッターに 1/2, 2/2 とある。つまり HTML を生成する時点で「この doc が何ページ目か」は分からない。解決策: 単一 HTML で表紙 + 本文全セクションを並べ、フッターは「ページ番号」を表示しないか、または「− / −」にしておく。Puppeteer の displayHeaderFooter と footerTemplate で pageNumber/totalPages を渡せばよい。設計書 9 節: 「本番PDF: Puppeteer の displayHeaderFooter と footerTemplate で pageNumber/totalPages を渡し」→ つまり HTML 本文にはフッターの「ページ番号」を書かず、Puppeteer の footerTemplate で出力する。すると、ヘッダーも displayHeaderFooter の headerTemplate で出すか、またはサンプル通り本文中に .report-header を入れるか。サンプルは本文中にヘッダー・フッターを書いているので、PDF ではページが変わっても同じヘッダー・フッターが繰り返し表示されない（各 .doc が1ページなら各々にヘッダー・フッターがある）。Puppeteer は setContent で1つの HTML を渡すので、複数 .doc だと複数ページになる。各 .doc に .report-footer で「1/2」「2/2」を書くには、生成時点で総ページ数が必要。総ページ数は PDF を一度生成しないと分からない。簡易案: フッターのページ番号は「© 2026 SOLVE WISE」と文責だけにし、ページ番号は footerTemplate で付与する。そうすれば HTML 本文のフッターにはページ番号を書かず、Puppeteer の displayHeaderFooter で footerTemplate に `${pageNumber} / ${totalPages}` を渡す。その場合、本文中の .report-footer は削除するか、文責と Copyright だけにして、ページ番号は footerTemplate に任せる。いずれにせよ、サンプルに合わせるなら「本文中にフッターを書く」形で、総ページ数が不明なので「1」「2」のような連番もやめ、フッターには「文責」「© 2026 SOLVE WISE」のみにする。または footerTemplate で「ページ番号 + 文責 + Copyright」を一括表示する。採用: Puppeteer の displayHeaderFooter を true にし、headerTemplate と footerTemplate でサンプルと同じスタイルのヘッダー・フッターを出す。HTML 本文からは .report-header と .report-footer を除く（表紙はそのまま）。这样、ページ番号は自動で正確になる。
  - 実装方針を簡素化: まずは **HTML 本文にヘッダー・フッターをそのまま含め**、各「ページ」を表す .doc を1つにまとめず、表紙の次に「本文ブロック」を一つだけ置く（セクションは連続）。フッターは「文責 · © 2026 SOLVE WISE」のみとし、ページ番号は **Puppeteer の footerTemplate で付与**する。つまり HTML 側のフッターではページ番号を表示しない。すると、ヘッダーは毎ページ必要なので、displayHeaderFooter の headerTemplate で出す方が一貫する。結論: **headerTemplate / footerTemplate でヘッダー・フッターを出力し、HTML 本文は表紙 + セクションのみ**にする。サンプルの見た目（色・ロゴ・文言）は template に合わせる。
- **ロゴ画像**: headerTemplate/footerTemplate は HTML 断片なので、画像は data URL または絶対URL。API 内でロゴを読み込んで data URL に変換するか、またはテキストのみ「SOLVE WISE」にしてロゴなしで実装し、後でロゴ対応するか。サンプルはロゴあり。実装では `request.nextUrl.origin` を generatePDFReport に渡し、headerTemplate で `<img src="${origin}/logo.png">` とすると、Puppeteer がその URL にアクセスする際に origin がローカルになる。Vercel では origin が本番URLになるので可。開発時は localhost。→ オプションで `baseUrl?: string` を渡し、API で `request.nextUrl.origin` を渡す。
- **表**: 既存 `generateTableHTML` の class を `swot-table` から `report-table` に変更し、サンプルと同じスタイル（th グラデーション、.report-table-wrap）を適用。
- **プロセス図**: 初回実装では省略し、既存の list/html のまま。必要なら後で「番号付きリストを process-flow に変換」を追加。

---

## 4. API（app/api/tools/generate-report/route.ts）

- body に `orientation?: 'portrait' | 'landscape'`, `authorLabel?: string`, `baseUrl?: string` を追加。
- `generatePDFReport({ sections, metadata, orientation, authorLabel, baseUrl })` に渡す。

---

## 5. ExportDialog（components/consulting/ExportDialog.tsx）

- フォーマットが PDF のときのみ「用紙の向き」を表示。ラジオまたはボタンで「横（A4 横向き）」「縦（A4 縦向き）」を選択（デフォルト横）。
- `downloadPDF` 呼び出し時に `orientation` と `authorLabel: 'AI参謀 - AI経営コンサルティング'` を body に含める。`baseUrl` は `window.location.origin` で渡す。

---

## 6. セキュリティ・制約

- baseUrl は API で検証し、自サイト origin 以外は拒否するか、または API 内で `request.nextUrl.origin` のみを使用し、クライアントからは渡さない（推奨）。→ クライアントから baseUrl は送らず、API で `request.headers.get('x-forwarded-host')` や Next の request.url から origin を組み立てる。
- 変更は 1 ファイルずつ。レベル2（API）変更時は変更通知する。
