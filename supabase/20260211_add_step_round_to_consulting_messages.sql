-- Migration: Add step_round to consulting_messages
-- Date: 2026-02-11
-- Purpose: どのメッセージがどのSTEPの会話か判別するため。設計: design_20260211_step_back_and_conversation_per_step.md
-- Rollback: ALTER TABLE consulting_messages DROP COLUMN IF EXISTS step_round;

-- step_round: 1=STEP1(課題のヒアリング) 〜 5=STEP5。現在のSTEP = current_round + 1（1始まり）
ALTER TABLE consulting_messages
ADD COLUMN IF NOT EXISTS step_round INTEGER NOT NULL DEFAULT 1;

-- 既存行は DEFAULT 1 により 1 が入る（PostgreSQL の ADD COLUMN ... DEFAULT は既存行にも適用される）
-- 範囲はアプリ側で 1〜max_rounds を保証（DB制約は将来の拡張のため付けない）

-- インデックス: セッション＋ステップでフィルタする取得用
CREATE INDEX IF NOT EXISTS idx_consulting_messages_session_step
ON consulting_messages (session_id, step_round);

COMMENT ON COLUMN consulting_messages.step_round IS 'メッセージが属するSTEP。1=課題のヒアリング 〜 5。current_round+1 でセット。';
