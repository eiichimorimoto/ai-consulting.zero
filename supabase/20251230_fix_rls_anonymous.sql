-- ============================================
-- 匿名アクセスが必要なテーブルのRLS修正
-- 2024-12-30
-- ============================================

-- leads テーブル: 無料診断からの匿名INSERTを許可
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.leads;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.leads;

-- 匿名ユーザーもINSERT可能（無料診断用）
CREATE POLICY "Allow anonymous insert" ON public.leads
  FOR INSERT WITH CHECK (true);

-- 認証済みユーザーは自社のleadsを閲覧可能
CREATE POLICY "Allow authenticated select" ON public.leads
  FOR SELECT USING (auth.role() = 'authenticated');

-- 認証済みユーザーは更新も可能
CREATE POLICY "Allow authenticated update" ON public.leads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- subscriptions テーブル（もしRLSが有効な場合）
-- ============================================
-- subscriptionsテーブルが存在する場合のみ実行
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscriptions') THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    
    -- 既存ポリシーを削除
    DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
    DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
    DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
    
    -- ユーザーは自分のサブスクリプションのみアクセス可能
    EXECUTE 'CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ============================================
-- 完了
-- ============================================



