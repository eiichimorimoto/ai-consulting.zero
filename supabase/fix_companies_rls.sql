-- companiesテーブルに不足しているカラムを全て追加
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_year_end INTEGER CHECK (fiscal_year_end >= 1 AND fiscal_year_end <= 12);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS retrieved_info JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS documents_urls TEXT[];
