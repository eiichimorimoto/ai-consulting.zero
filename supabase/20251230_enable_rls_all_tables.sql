-- ============================================
-- RLSを有効化（シンプル版）
-- 2024-12-30 セキュリティ修正
-- ============================================
-- company_idが存在しないテーブルがあるため、
-- まずはRLSを有効化し、シンプルなポリシーを設定

-- 1. companies テーブル
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.companies;
CREATE POLICY "Allow all for authenticated users" ON public.companies
  FOR ALL USING (auth.role() = 'authenticated');

-- 2. keyword_analysis テーブル
ALTER TABLE public.keyword_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.keyword_analysis;
CREATE POLICY "Allow all for authenticated users" ON public.keyword_analysis
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. diagnostic_reports テーブル
ALTER TABLE public.diagnostic_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.diagnostic_reports;
CREATE POLICY "Allow all for authenticated users" ON public.diagnostic_reports
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. employee_reviews テーブル
ALTER TABLE public.employee_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.employee_reviews;
CREATE POLICY "Allow all for authenticated users" ON public.employee_reviews
  FOR ALL USING (auth.role() = 'authenticated');

-- 5. job_postings テーブル
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.job_postings;
CREATE POLICY "Allow all for authenticated users" ON public.job_postings
  FOR ALL USING (auth.role() = 'authenticated');

-- 6. customer_reviews テーブル
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.customer_reviews;
CREATE POLICY "Allow all for authenticated users" ON public.customer_reviews
  FOR ALL USING (auth.role() = 'authenticated');

-- 7. digital_scores テーブル
ALTER TABLE public.digital_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.digital_scores;
CREATE POLICY "Allow all for authenticated users" ON public.digital_scores
  FOR ALL USING (auth.role() = 'authenticated');

-- 8. data_collection_logs テーブル
ALTER TABLE public.data_collection_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.data_collection_logs;
CREATE POLICY "Allow all for authenticated users" ON public.data_collection_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- 9. leads テーブル
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.leads;
CREATE POLICY "Allow all for authenticated users" ON public.leads
  FOR ALL USING (auth.role() = 'authenticated');

-- 10. diagnosis_previews テーブル（匿名アクセス許可）
ALTER TABLE public.diagnosis_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.diagnosis_previews;
CREATE POLICY "Allow all access" ON public.diagnosis_previews
  FOR ALL USING (true);

-- 11. profiles テーブル（重要：サインアップ時に必要）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 完了
-- ============================================
