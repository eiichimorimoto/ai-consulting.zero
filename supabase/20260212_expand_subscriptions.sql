-- ==============================================
-- subscriptions テーブル拡張マイグレーション
-- 仕様書: stripe-payment-spec-v2.2.md §3-0
--
-- 実行順序が重要:
--   1. 新規カラム追加
--   2. 新規カラムのCHECK制約追加
--   3. 既存status CHECK制約をDROP → VARCHAR(50)に拡張 → 8値CHECK制約追加
--   4. plan_type CHECK制約追加
-- ==============================================

-- -----------------------------------------------
-- 1. 新規5カラム追加（§3-0 新規カラム）
-- -----------------------------------------------
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS app_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

-- -----------------------------------------------
-- 2. 新規カラムのCHECK制約追加
-- -----------------------------------------------

-- app_status: active / suspended / pending のみ許可
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_app_status_check
  CHECK (app_status IN ('active', 'suspended', 'pending'));

-- billing_interval: monthly / yearly のみ許可（NULLも許可 — Freeプラン時）
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_interval_check
  CHECK (billing_interval IN ('monthly', 'yearly'));

-- -----------------------------------------------
-- 3. status拡張: 4値 → 8値（Stripe準拠）
--    重要: DROP → ALTER → ADD の順で実行すること
-- -----------------------------------------------

-- 3a. 既存のCHECK制約をDROP
--     インラインCHECK制約のため、PostgreSQLが自動生成した名前を使用
--     名前が不明な場合は以下のクエリで確認:
--     SELECT constraint_name FROM information_schema.check_constraints
--     WHERE constraint_schema = 'public' AND constraint_name LIKE '%status%';
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- 3b. VARCHAR(20) → VARCHAR(50) に拡張
--     最長値 'incomplete_expired' は 18文字だが、将来の拡張性を考慮
ALTER TABLE subscriptions ALTER COLUMN status TYPE VARCHAR(50);

-- 3c. Stripe全8ステータスのCHECK制約を追加
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
  ));

-- -----------------------------------------------
-- 4. plan_type CHECK制約追加
--    既存: CHECK制約なし（schema.sql L242）
--    profiles.plan_typeには既にCHECK制約あり（schema.sql L90）
-- -----------------------------------------------
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('free', 'pro', 'enterprise'));
