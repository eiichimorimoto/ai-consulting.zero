-- ステップを戻ったときに「一時中止」を正しく表示するため、
-- 一度でも進んだ最大 round を保持するカラムを追加する。
-- （current_round は戻ると減るが、max_reached_round は減らない）

ALTER TABLE consulting_sessions
  ADD COLUMN IF NOT EXISTS max_reached_round integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN consulting_sessions.max_reached_round IS '一度でも進んだ最大 round（0始まり）。ステップ戻り時の「一時中止」判定に使用。';

-- 既存データ: current_round を上限として反映
UPDATE consulting_sessions
SET max_reached_round = GREATEST(COALESCE(max_reached_round, 0), COALESCE(current_round, 0))
WHERE max_reached_round < COALESCE(current_round, 0);
