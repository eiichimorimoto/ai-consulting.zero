# 設計: レポート要求の復唱フローとMarkdownエクスポート

**日付**: 2026-02-09

## 概要

- AIの回答のレポート化は、ユーザーが「レポート」「資料」などを**明示的に要求したとき**に作成する。
- AIはユーザー発言を解析し、レポート/資料の出力依頼と判断した場合に**復唱**する（例:「〇〇のレポートをお作りしますね。よろしければ『はい』や『お願いします』と送信してください。」）。
- ユーザーがOKと返した場合、**Difyに元の依頼文で問い合わせ**、得た内容をレポート形式でPDF/PPT/Markdownにできるようにする。
- エクスポート形式に**Markdown（.md）**を追加する。

## フロー

1. **ユーザー送信** → メッセージAPIで受信。
2. **レポート依頼判定**  
   `isReportRequest(message)` が true かつ、セッションに `pending_report_query` が**ない**場合:  
   - ユーザーメッセージを保存。  
   - セッションに `pending_report_query = message` を保存。  
   - Difyは呼ばず、復唱文（`buildEchoReply(message)`）をAI応答として保存して返す。
3. **確認判定**  
   セッションに `pending_report_query` が**あり**、かつ `isConfirmation(message)` が true の場合:  
   - ユーザーメッセージを保存。  
   - Difyに **`pending_report_query`** をクエリとして送信。  
   - 返ってきた内容をAI応答として保存。  
   - セッションの `pending_report_query` を null に更新。
4. **上記以外**  
   従来どおり、送信メッセージでDifyを呼び、応答を保存。

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `supabase/20260209_add_pending_report_query.sql` | `consulting_sessions.pending_report_query` カラム追加 |
| `types/database.types.ts` | `pending_report_query` を Row/Insert/Update に追加 |
| `lib/consulting/report-request.ts` | 新規: `isReportRequest`, `isConfirmation`, `buildEchoReply` |
| `app/api/consulting/sessions/[id]/messages/route.ts` | 復唱/確認分岐と Dify 呼び出しクエリの切り替え |
| `lib/report/builder.ts` | `buildReportMarkdown`, `sectionToMarkdown`, `ReportMarkdownMetadata` 追加 |
| `components/consulting/ExportDialog.tsx` | 形式に Markdown を追加、`downloadMarkdown` 実装 |

## レポート依頼の判定キーワード（例）

- レポートを（作成|作って|出力|出して|ください|お願い）
- 資料を（作成|…）
- （まとめて|まとめ）（レポート|資料|報告）
- 報告書・提案書・PDF の出力依頼表現

## 確認と解釈する返答（例）

- はい / うん / OK / お願い / お願いします / よろしく / かまいません / 大丈夫（短い返答）

## Markdownエクスポート

- エクスポート形式に「Markdown」を追加。
- Dify由来のセクションは **body（Markdown原文）** をそのまま使用。
- 会話・SWOT等の付録セクションは `sectionToMarkdown` でテキスト/表/リストをMarkdownに変換。
- ファイル名: `report-{セッション名}-{日付}.md`。

## マイグレーション実行

```bash
# Supabase で実行
psql $DATABASE_URL -f supabase/20260209_add_pending_report_query.sql
```
