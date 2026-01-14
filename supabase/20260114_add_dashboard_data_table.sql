-- ==============================================
-- Migration: Add dashboard_data table
-- Date: 2026-01-14
-- Purpose: ダッシュボードデータキャッシュテーブルの追加
--          SWOT分析とAI経営サマリーのキャッシュ用
-- ==============================================

-- テーブル作成
CREATE TABLE IF NOT EXISTS dashboard_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- データ種別（'swot_analysis', 'ai_summary', 'local_info', 'market'）
  data_type VARCHAR(50) NOT NULL,
  
  -- データ本体（JSONB形式）
  data JSONB NOT NULL,
  
  -- キャッシュ有効期限
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ユニーク制約（ユーザー・会社・データ種別の組み合わせは1つのみ）
  UNIQUE(user_id, company_id, data_type)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_dashboard_data_user_id ON dashboard_data (user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_data_company_id ON dashboard_data (company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_data_data_type ON dashboard_data (data_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_data_updated_at ON dashboard_data (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_data_expires_at ON dashboard_data (expires_at DESC);

-- Trigger作成（update_updated_at_column関数は既存を利用）
DROP TRIGGER IF EXISTS update_dashboard_data_updated_at ON dashboard_data;
CREATE TRIGGER update_dashboard_data_updated_at
  BEFORE UPDATE ON dashboard_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS有効化
ALTER TABLE dashboard_data ENABLE ROW LEVEL SECURITY;

-- RLSポリシー作成
DROP POLICY IF EXISTS "Users can view own dashboard data" ON dashboard_data;
CREATE POLICY "Users can view own dashboard data"
  ON dashboard_data FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own dashboard data" ON dashboard_data;
CREATE POLICY "Users can insert own dashboard data"
  ON dashboard_data FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own dashboard data" ON dashboard_data;
CREATE POLICY "Users can update own dashboard data"
  ON dashboard_data FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own dashboard data" ON dashboard_data;
CREATE POLICY "Users can delete own dashboard data"
  ON dashboard_data FOR DELETE
  USING (user_id = auth.uid());

-- ==============================================
-- Migration完了
-- ==============================================
-- 次のステップ:
-- 1. Supabaseコンソールでこのマイグレーションを実行
-- 2. APIコード（swot-analysis, ai-summary）を修正してキャッシュ機能を追加
-- ==============================================
