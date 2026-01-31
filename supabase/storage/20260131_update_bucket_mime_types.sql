-- ==============================================
-- Supabase Storage設定更新: MIMEタイプ拡張
-- 作成日: 2026-01-31
-- 目的: Markdown, PDF, Officeファイル対応
-- ==============================================

-- consulting-attachments バケットのMIMEタイプ更新
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- テキストファイル
  'text/plain',
  'text/csv',
  'application/csv',
  'text/markdown',
  
  -- PDFファイル
  'application/pdf',
  
  -- Microsoft Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  
  -- Microsoft Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  
  -- Microsoft PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
WHERE id = 'consulting-attachments';

-- ==============================================
-- 対応ファイル形式一覧
-- ==============================================
-- .txt  - text/plain
-- .csv  - text/csv, application/csv
-- .md   - text/markdown
-- .pdf  - application/pdf
-- .doc  - application/msword
-- .docx - application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- .xls  - application/vnd.ms-excel
-- .xlsx - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
-- .ppt  - application/vnd.ms-powerpoint
-- .pptx - application/vnd.openxmlformats-officedocument.presentationml.presentation
--
-- 注意:
-- - Googleドキュメント/スプレッドシートは、エクスポート形式(.docx, .xlsx等)で対応
-- - ファイルサイズ上限: 10MB
