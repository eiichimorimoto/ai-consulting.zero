-- ============================================
-- RLS 有効化: public.pagespeed_cache
-- 2026-02-11 Supabase Security Advisor 対応
-- ============================================
-- テーブル: PageSpeed Insights API の結果キャッシュ（URL+strategy 単位）
-- アクセス: 認証済みユーザーのみ（diagnose-preview API 等で利用）

ALTER TABLE public.pagespeed_cache ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザー: 読み取り・書き込みを許可（キャッシュの取得・保存に必要）
DROP POLICY IF EXISTS "Allow authenticated read write pagespeed_cache" ON public.pagespeed_cache;
CREATE POLICY "Allow authenticated read write pagespeed_cache" ON public.pagespeed_cache
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 有効期限切れ削除関数: SECURITY DEFINER で RLS をバイパスして実行可能にする
-- （pg_cron や手動実行時も確実に削除できるようにする）
CREATE OR REPLACE FUNCTION cleanup_expired_pagespeed_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pagespeed_cache
  WHERE expires_at < NOW();
  RAISE NOTICE '古いPageSpeedキャッシュを削除しました';
END;
$$;

COMMENT ON TABLE public.pagespeed_cache IS 'PageSpeed Insights APIの結果をキャッシュし、API使用量を削減（RLS: 認証済みユーザーのみ）';
