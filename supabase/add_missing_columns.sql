-- companies テーブルに不足しているカラムを追加
ALTER TABLE companies ADD COLUMN IF NOT EXISTS retrieved_info JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS documents_urls TEXT[];
