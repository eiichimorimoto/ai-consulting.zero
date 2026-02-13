-- ==============================================
-- plan_type 自動同期トリガー
-- 仕様書: stripe-payment-spec-v2.2.md §3-6
--
-- 目的: subscriptions.plan_type（Single Source of Truth）が
--       更新されたとき、profiles.plan_type（UIキャッシュ）に
--       自動同期する。
--
-- SECURITY DEFINER: profiles テーブルのRLSをバイパスして
--                   確実に更新するために必要
-- ==============================================

CREATE OR REPLACE FUNCTION sync_plan_type_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET plan_type = NEW.plan_type,
      updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_plan_type_after_subscription_update
  AFTER INSERT OR UPDATE OF plan_type ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_plan_type_to_profiles();
