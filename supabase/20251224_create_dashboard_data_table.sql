-- ==============================================
-- ダッシュボード外部データ保存用テーブル
-- 実行日: 2025-12-24
-- ==============================================

-- dashboard_data: 外部APIから取得したデータをキャッシュ
CREATE TABLE IF NOT EXISTS dashboard_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- データタイプ
  data_type VARCHAR(50) NOT NULL, -- 'market', 'local_info', 'industry_trends', 'swot_analysis', 'world_news', 'industry_forecast'
  
  -- データ本体（JSONB）
  data JSONB NOT NULL,
  
  -- メタデータ
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- キャッシュの有効期限
  
  -- ユニーク制約（同じユーザー・会社・データタイプの組み合わせは1つまで）
  UNIQUE(user_id, company_id, data_type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_dashboard_data_user_id ON dashboard_data(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_data_company_id ON dashboard_data(company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_data_type ON dashboard_data(data_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_data_expires_at ON dashboard_data(expires_at);

-- RLS
ALTER TABLE dashboard_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboard data"
  ON dashboard_data FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own dashboard data"
  ON dashboard_data FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dashboard data"
  ON dashboard_data FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own dashboard data"
  ON dashboard_data FOR DELETE
  USING (user_id = auth.uid());

-- 自動更新トリガー
CREATE OR REPLACE FUNCTION update_dashboard_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dashboard_data_updated_at
  BEFORE UPDATE ON dashboard_data
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_data_updated_at();

COMMENT ON TABLE dashboard_data IS 'ダッシュボードで表示する外部APIから取得したデータのキャッシュ';
COMMENT ON COLUMN dashboard_data.data_type IS 'データタイプ: market, local_info, industry_trends, swot_analysis, world_news, industry_forecast';
COMMENT ON COLUMN dashboard_data.data IS 'データ本体（JSONB形式）';
COMMENT ON COLUMN dashboard_data.expires_at IS 'キャッシュの有効期限（NULLの場合は無期限）';

