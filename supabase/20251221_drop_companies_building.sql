-- ==============================================
-- companies.building カラム削除
-- Supabaseダッシュボードの SQL Editor で実行してください
-- ==============================================

-- 事前確認（任意）
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'companies'
-- ORDER BY ordinal_position;

ALTER TABLE public.companies
  DROP COLUMN IF EXISTS building;

-- 補足:
-- - UI/保存処理側では「建物名」入力を廃止し、住所の入力欄は「町名番地以下」として保存します。
-- - 既存データの building は削除されます（復元したい場合は事前にバックアップしてください）。




