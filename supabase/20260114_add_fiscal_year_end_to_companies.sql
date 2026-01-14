-- ==============================================
-- Migration: Add fiscal_year_end to companies table
-- Date: 2026-01-14
-- Purpose: 会社情報に決算月フィールドを追加
--          新規登録とアカウント設定で使用
-- ==============================================

-- 決算月フィールドを追加（1-12の整数、NULLを許可）
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS fiscal_year_end INTEGER 
CHECK (fiscal_year_end >= 1 AND fiscal_year_end <= 12);

-- カラムにコメントを追加
COMMENT ON COLUMN companies.fiscal_year_end IS '決算月（1=1月、2=2月、...、12=12月）';

-- ==============================================
-- Migration完了
-- ==============================================
-- 次のステップ:
-- 1. Supabaseコンソールでこのマイグレーションを実行
-- 2. 新規登録フォームに決算月の入力欄を追加
-- 3. アカウント設定画面に決算月の編集欄を追加
-- ==============================================
