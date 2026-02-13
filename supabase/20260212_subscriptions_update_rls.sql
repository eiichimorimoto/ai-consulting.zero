-- ==============================================
-- subscriptions UPDATE RLSポリシー追加
-- 仕様書: stripe-payment-spec-v2.2.md §3-3
--
-- 既存: SELECT + INSERT ポリシーのみ（schema.sql L498-505）
-- 追加: UPDATE ポリシー
-- 理由: /api/stripe/change-plan 等でのsubscriptions更新に必要
--       Webhook経由（service_role）はRLSバイパスのため影響なし
-- ==============================================

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (user_id = auth.uid());
