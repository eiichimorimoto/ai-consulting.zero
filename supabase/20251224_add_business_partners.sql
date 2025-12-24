-- ==============================================
-- 会社テーブルに取引先数フィールドを追加
-- 実行日: 2025-12-24
-- ==============================================

-- business_partners: 取引先数（整数）
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS business_partners INTEGER;

COMMENT ON COLUMN companies.business_partners IS '取引先数（整数）';

-- ==============================================
-- 確認用クエリ
-- ==============================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'companies' AND column_name = 'business_partners';

