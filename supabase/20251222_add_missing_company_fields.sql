-- ==============================================
-- 会社テーブルに不足しているフィールドを追加
-- 実行日: 2025-12-22
-- ==============================================

-- 1. documents_urls: 会社資料のパス配列（SettingsContentで使用）
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS documents_urls TEXT[];

COMMENT ON COLUMN companies.documents_urls IS '会社資料ファイルのパス配列（company-documentsバケット内）';

-- 2. retrieved_info: Web検索で取得した会社情報（JSON形式）
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS retrieved_info JSONB;

COMMENT ON COLUMN companies.retrieved_info IS 'Web検索で取得した会社情報（業種、従業員数、売上、主要製品等）';

-- ==============================================
-- 確認用クエリ
-- ==============================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'companies'
-- ORDER BY ordinal_position;




