-- ==============================================
-- AI CONSULTING APP - SUPABASE SCHEMA
-- ==============================================
-- Organization: eiichimorimoto'sOrg
-- Project Name: ai^consulting-zero
-- Project URL: https://fwruumlkxzfihlmygrww.supabase.co
-- ==============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. COMPANIES TABLE (会社情報)
-- 同一会社のユーザー間で共有される
-- ==============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_kana VARCHAR(255),
  corporate_number VARCHAR(13),
  
  -- 住所情報
  postal_code VARCHAR(8),
  prefecture VARCHAR(20),
  city VARCHAR(100),
  address TEXT,
  building VARCHAR(255),
  
  -- 連絡先
  phone VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- 会社情報
  industry VARCHAR(100),
  employee_count VARCHAR(50),
  capital VARCHAR(50),
  annual_revenue VARCHAR(50),
  established_date DATE,
  representative_name VARCHAR(100),
  business_description TEXT,
  main_products TEXT[],
  main_clients TEXT[],
  main_banks TEXT[],
  
  -- 課題・状況
  current_challenges TEXT[],
  growth_stage VARCHAR(50),
  it_maturity_level VARCHAR(50),
  
  -- メタデータ
  source VARCHAR(100),
  source_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 会社名検索用インデックス
-- 日本語全文検索はSupabaseで標準サポートされていないため、通常のインデックスを使用
CREATE INDEX idx_companies_name ON companies (name);
CREATE INDEX idx_companies_name_kana ON companies (name_kana);
CREATE INDEX idx_companies_name_lower ON companies (LOWER(name)); -- 大文字小文字を区別しない検索用

-- ==============================================
-- 2. PROFILES TABLE (ユーザープロファイル)
-- ==============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- 基本情報
  name VARCHAR(100) NOT NULL,
  name_kana VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  mobile VARCHAR(20),
  position VARCHAR(100),
  department VARCHAR(100),
  avatar_url TEXT,
  
  -- プラン情報
  plan_type VARCHAR(20) DEFAULT 'free' CHECK (plan_type IN ('free', 'standard', 'enterprise')),
  monthly_chat_count INTEGER DEFAULT 0,
  monthly_ocr_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 3. BUSINESS_CARDS TABLE (名刺情報)
-- ==============================================
CREATE TABLE business_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- 個人情報（名刺から取得）
  person_name VARCHAR(100) NOT NULL,
  person_name_kana VARCHAR(100),
  position VARCHAR(100),
  department VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  mobile VARCHAR(20),
  fax VARCHAR(20),
  
  -- 住所情報
  postal_code VARCHAR(8),
  address TEXT,
  
  -- 会社情報（OCRから取得、company_idとリンク前の一時保存用）
  company_name VARCHAR(255),
  website VARCHAR(500),
  
  -- OCR関連
  image_url TEXT,
  ocr_raw_text TEXT,
  ocr_confidence DECIMAL(5,2),
  
  -- メモ
  notes TEXT,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 名前・会社名検索用インデックス
-- 日本語全文検索はSupabaseで標準サポートされていないため、通常のインデックスを使用
CREATE INDEX idx_business_cards_person_name ON business_cards (person_name);
CREATE INDEX idx_business_cards_company_name ON business_cards (company_name);
CREATE INDEX idx_business_cards_user_id ON business_cards (user_id);
CREATE INDEX idx_business_cards_person_name_lower ON business_cards (LOWER(person_name)); -- 大文字小文字を区別しない検索用
CREATE INDEX idx_business_cards_company_name_lower ON business_cards (LOWER(company_name)); -- 大文字小文字を区別しない検索用

-- ==============================================
-- 4. COMPANY_WEB_RESOURCES TABLE (Web検索結果)
-- ==============================================
CREATE TABLE company_web_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  url TEXT NOT NULL,
  title VARCHAR(500),
  description TEXT,
  resource_type VARCHAR(50),
  scraped_content TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  relevance_score DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 5. CONSULTING_SESSIONS TABLE (コンサルセッション)
-- ==============================================
CREATE TABLE consulting_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  session_type VARCHAR(50) DEFAULT 'general',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  
  -- 分析結果
  analysis_summary TEXT,
  key_insights JSONB,
  recommendations JSONB,
  risk_assessment JSONB,
  
  message_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consulting_sessions_user_id ON consulting_sessions (user_id);
CREATE INDEX idx_consulting_sessions_status ON consulting_sessions (status);

-- ==============================================
-- 6. CONSULTING_MESSAGES TABLE (チャットメッセージ)
-- ==============================================
CREATE TABLE consulting_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES consulting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attachments JSONB,
  analysis_type VARCHAR(50),
  confidence_score DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consulting_messages_session_id ON consulting_messages (session_id);

-- ==============================================
-- 7. REPORTS TABLE (レポート)
-- ==============================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES consulting_sessions(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  executive_summary TEXT,
  content JSONB,
  metrics JSONB,
  charts_data JSONB,
  score INTEGER,
  
  pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 8. SUBSCRIPTIONS TABLE (サブスクリプション)
-- ==============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  plan_type VARCHAR(20) NOT NULL DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- 使用量追跡
  chat_count INTEGER DEFAULT 0,
  ocr_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 9. ACTIVITY_LOGS TABLE (アクティビティログ)
-- ==============================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs (user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs (created_at DESC);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_cards_updated_at
  BEFORE UPDATE ON business_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consulting_sessions_updated_at
  BEFORE UPDATE ON consulting_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile and subscription on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with error handling
  BEGIN
    INSERT INTO profiles (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), NEW.email);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
      -- Continue even if profile creation fails
  END;
  
  -- Insert subscription with error handling
  BEGIN
    INSERT INTO subscriptions (user_id, plan_type, status)
    VALUES (NEW.id, 'free', 'active');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create subscription for user %: %', NEW.id, SQLERRM;
      -- Continue even if subscription creation fails
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update session message count
CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE consulting_sessions
  SET message_count = message_count + 1
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_count
  AFTER INSERT ON consulting_messages
  FOR EACH ROW EXECUTE FUNCTION update_session_message_count();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_web_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE consulting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consulting_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Companies: 同じ会社のユーザーは閲覧可能
CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert companies"
  ON companies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Profiles: 自分のプロファイルのみ
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Business Cards: 自分の名刺のみ
CREATE POLICY "Users can view own business cards"
  ON business_cards FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own business cards"
  ON business_cards FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own business cards"
  ON business_cards FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own business cards"
  ON business_cards FOR DELETE
  USING (user_id = auth.uid());

-- Company Web Resources: 自分の会社のリソースのみ
CREATE POLICY "Users can view company web resources"
  ON company_web_resources FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert company web resources"
  ON company_web_resources FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Consulting Sessions: 自分のセッションのみ
CREATE POLICY "Users can view own sessions"
  ON consulting_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON consulting_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON consulting_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- Consulting Messages: セッションの所有者のみ
CREATE POLICY "Users can view own session messages"
  ON consulting_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM consulting_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own session messages"
  ON consulting_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM consulting_sessions WHERE user_id = auth.uid()
    )
  );

-- Reports: 自分のレポートのみ
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reports"
  ON reports FOR UPDATE
  USING (user_id = auth.uid());

-- Subscriptions: 自分のサブスクリプションのみ
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Activity Logs: 自分のログのみ
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ==============================================
-- STORAGE BUCKETS
-- ==============================================
-- Note: Run these in Supabase Dashboard > Storage

-- CREATE BUCKET 'avatars' (public)
-- CREATE BUCKET 'business-cards' (private)
-- CREATE BUCKET 'reports' (private)

-- ==============================================
-- SAMPLE DATA (Optional)
-- ==============================================

-- Industry master data
INSERT INTO companies (name, industry) VALUES 
  ('サンプル会社A', '情報通信業'),
  ('サンプル会社B', '製造業')
ON CONFLICT DO NOTHING;
