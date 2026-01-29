-- ==============================================
-- Supabase Storage設定: 添付ファイル保存用バケット
-- 作成日: 2026-01-29
-- 目的: 相談セッションの添付ファイルを保存
-- ==============================================

-- consulting-attachments バケット作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'consulting-attachments',
  'consulting-attachments',
  false, -- 認証必須
  10485760, -- 10MB (10 * 1024 * 1024)
  ARRAY[
    'text/plain',
    'text/csv',
    'application/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- Row Level Security (RLS) ポリシー
-- ==============================================

-- ユーザーは自分のファイルのみアップロード可能
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'consulting-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のファイルのみ閲覧可能
CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'consulting-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のファイルのみ削除可能
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'consulting-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のファイルのみ更新可能（上書き）
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'consulting-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ==============================================
-- 使用方法
-- ==============================================
-- ファイルパス: {user_id}/{session_id}/{filename}
-- 例: 123e4567-e89b-12d3-a456-426614174000/abc123.../document_1234567890.txt
