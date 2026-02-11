-- PageSpeed結果キャッシュテーブル
-- 同じURLの分析結果を1日間キャッシュし、API使用量を大幅削減
-- ※ RLS は supabase/20260211_enable_rls_pagespeed_cache.sql で有効化すること

CREATE TABLE IF NOT EXISTS pagespeed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- キャッシュキー
  url TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('mobile', 'desktop')),
  
  -- 分析結果（JSON形式）
  result JSONB NOT NULL,
  
  -- メタデータ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  
  -- インデックス用
  UNIQUE(url, strategy)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_pagespeed_cache_url_strategy 
  ON pagespeed_cache(url, strategy);

CREATE INDEX IF NOT EXISTS idx_pagespeed_cache_expires 
  ON pagespeed_cache(expires_at);

-- 有効期限切れのデータを自動削除（定期実行）
-- Supabase Database Webhooksまたはpg_cronで実行
CREATE OR REPLACE FUNCTION cleanup_expired_pagespeed_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM pagespeed_cache
  WHERE expires_at < NOW();
  
  RAISE NOTICE '古いPageSpeedキャッシュを削除しました';
END;
$$;

-- コメント
COMMENT ON TABLE pagespeed_cache IS 'PageSpeed Insights APIの結果をキャッシュし、API使用量を削減';
COMMENT ON COLUMN pagespeed_cache.url IS '分析対象URL';
COMMENT ON COLUMN pagespeed_cache.strategy IS 'デバイス戦略（mobile/desktop）';
COMMENT ON COLUMN pagespeed_cache.result IS '分析結果（JSON形式）';
COMMENT ON COLUMN pagespeed_cache.expires_at IS '有効期限（24時間後）';
