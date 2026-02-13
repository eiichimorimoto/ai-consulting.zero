-- ==============================================
-- Stripe関連 新規テーブル作成 + RLS設定
-- 仕様書: stripe-payment-spec-v2.2.md §3-1, §3-2, §3-3, §3-5
--
-- テーブル:
--   1. cancellation_reasons  — 解約理由（チャーン分析用）
--   2. payment_failures      — 未払い・督促管理
--   3. stripe_webhook_events — Webhook冪等性保証
-- ==============================================

-- -----------------------------------------------
-- 1. cancellation_reasons（§3-1）
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  reason_category TEXT NOT NULL,
  reason_detail TEXT,
  plan_at_cancel TEXT,
  months_subscribed INTEGER,
  cancel_type TEXT CHECK (cancel_type IN ('end_of_period', 'immediate')),
  retention_offered BOOLEAN DEFAULT false,
  retention_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- reason_category の有効値（UIで選択肢として表示）:
-- customer_service, low_quality, too_expensive, unused,
-- switched_service, missing_features, too_complex, other
-- ※ Stripe cancellation_details.feedback 全8値に対応

-- -----------------------------------------------
-- 2. payment_failures（§3-2）
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id TEXT,
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  dunning_status TEXT DEFAULT 'retry_scheduled'
    CHECK (dunning_status IN ('retry_scheduled', 'final_warning', 'suspended', 'resolved')),
  email_sent_count INTEGER DEFAULT 0,
  service_suspended_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 3. stripe_webhook_events（§3-5）
--    Webhook冪等性保証用。INSERT ON CONFLICT パターンで使用（§4-4）
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 4. RLS有効化（§3-3 前提条件）
--    これを実行しないとCREATEしたポリシーが機能しない
-- -----------------------------------------------
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 5. RLSポリシー設定（§3-3）
-- -----------------------------------------------

-- cancellation_reasons: ユーザーは自分の解約理由のみ作成・参照可能
CREATE POLICY "Users can insert own cancellation reasons"
  ON cancellation_reasons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own cancellation reasons"
  ON cancellation_reasons FOR SELECT
  USING (auth.uid() = user_id);

-- payment_failures: ユーザーは自分の未払い情報のみ参照可能
-- INSERT/UPDATEはservice_role（Webhook経由）のみ — RLSバイパス
CREATE POLICY "Users can view own payment failures"
  ON payment_failures FOR SELECT
  USING (auth.uid() = user_id);

-- stripe_webhook_events: ユーザーアクセス不可（service_roleのみ）
-- SELECTポリシーなし = 一般ユーザーはアクセス不可
