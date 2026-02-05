-- Migration: Add conversation_id to consulting_sessions
-- Date: 2026-02-05
-- Purpose: Difyの会話履歴IDを保存し、ページ遷移後も会話の文脈を維持する
-- Rollback: ALTER TABLE consulting_sessions DROP COLUMN IF EXISTS conversation_id;

-- Step 1: conversation_idカラム追加
ALTER TABLE consulting_sessions 
ADD COLUMN IF NOT EXISTS conversation_id TEXT NULL;

-- Step 2: インデックス追加（検索高速化）
-- 既存のインデックスと重複しないか確認
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'consulting_sessions' 
    AND indexname = 'idx_consulting_sessions_conversation_id'
  ) THEN
    CREATE INDEX idx_consulting_sessions_conversation_id 
    ON consulting_sessions(conversation_id);
  END IF;
END $$;

-- Step 3: カラムコメント追加（ドキュメント）
COMMENT ON COLUMN consulting_sessions.conversation_id IS 
'Dify Chat APIの会話履歴ID。会話の文脈を維持するために使用。NULLの場合は新規会話として扱う。';

-- Step 4: 確認用クエリ（実行後に確認）
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'consulting_sessions' 
-- AND column_name = 'conversation_id';
