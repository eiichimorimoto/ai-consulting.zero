-- ==============================================
-- データベースエラー修正用SQL
-- このファイルをSupabaseダッシュボードのSQL Editorで実行してください
-- ==============================================

-- 1. handle_new_user()関数をエラーハンドリング付きで更新
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

-- 2. profilesテーブルにINSERTポリシーを追加
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3. subscriptionsテーブルにINSERTポリシーを追加
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ==============================================
-- 適用完了
-- ==============================================







