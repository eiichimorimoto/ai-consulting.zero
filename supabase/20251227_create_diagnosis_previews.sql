-- diagnosis_previews テーブル: ランディングページからの無料診断結果を保存
CREATE TABLE IF NOT EXISTS diagnosis_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  url TEXT,
  overall_score INTEGER,
  top_issues JSONB,
  metrics JSONB,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_diagnosis_previews_email ON diagnosis_previews(email);
CREATE INDEX IF NOT EXISTS idx_diagnosis_previews_created_at ON diagnosis_previews(created_at DESC);

-- RLS ポリシー（必要に応じて有効化）
-- ALTER TABLE diagnosis_previews ENABLE ROW LEVEL SECURITY;

-- leads テーブル: リード情報（存在しない場合）
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- コメント
COMMENT ON TABLE diagnosis_previews IS 'ランディングページからの無料診断結果';
COMMENT ON TABLE leads IS 'リード（見込み客）情報';

