-- Migration: Add pending_report_query to consulting_sessions
-- Date: 2026-02-09
-- Purpose: レポート/資料の出力依頼時に復唱し、ユーザー確認後にDifyで内容取得するための一時保存
-- Rollback: ALTER TABLE consulting_sessions DROP COLUMN IF EXISTS pending_report_query;

ALTER TABLE consulting_sessions
ADD COLUMN IF NOT EXISTS pending_report_query TEXT NULL;

COMMENT ON COLUMN consulting_sessions.pending_report_query IS
'レポート・資料の出力依頼として復唱した直後、ユーザーの確認を待っている間の元メッセージ。確認後にDifyにこのクエリで問い合わせてレポート化する。';
